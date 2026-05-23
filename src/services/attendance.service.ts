import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import type {
  AttendanceBreakDto,
  AttendanceInsightsDto,
  AttendanceRecordDto,
  AttendanceStatsDto,
  AttendanceStatusValue,
  AttendanceWeeklyStatDto,
  BreakTypeValue,
  CalendarMonthDto,
  DeepWorkSessionDto,
  TaskDto,
  TimelineEntryDto,
} from '../types/domain';
import type { PersistedAttendance } from '../types/persistence';
import { minutesBetween, offsetDate, todayStr } from '../utils/dates';
import { listTasks } from './task.service';

const STANDARD_WORK_MINUTES = 8 * 60;
const OVERTIME_THRESHOLD_MINUTES = 9 * 60;
const BURNOUT_HOURS_THRESHOLD = 10 * 60;
const IDEAL_BREAK_RATIO = 0.1;

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function castBreaks(value: unknown): AttendanceBreakDto[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => {
    const breakEntry = item as Partial<AttendanceBreakDto>;
    return {
      breakId: String(breakEntry.breakId ?? randomUUID()),
      start: String(breakEntry.start ?? new Date().toISOString()),
      end: breakEntry.end ? String(breakEntry.end) : null,
      type: (breakEntry.type as BreakTypeValue) ?? 'custom',
    };
  });
}

function castDeepWorkSessions(value: unknown): DeepWorkSessionDto[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => {
    const session = item as Partial<DeepWorkSessionDto>;
    return {
      sessionId: String(session.sessionId ?? randomUUID()),
      start: String(session.start ?? new Date().toISOString()),
      end: session.end ? String(session.end) : null,
    };
  });
}

function castTimeline(value: unknown): TimelineEntryDto[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => {
    const entry = item as Partial<TimelineEntryDto>;
    return {
      time: String(entry.time ?? new Date().toISOString()),
      action: (entry.action as TimelineEntryDto['action']) ?? 'check-in',
    };
  });
}

function serializeAttendance(record: PersistedAttendance): AttendanceRecordDto {
  return {
    attendanceId: record.id,
    date: record.date,
    checkIn: record.checkIn?.toISOString() ?? null,
    checkOut: record.checkOut?.toISOString() ?? null,
    status: record.status as AttendanceStatusValue,
    breaks: castBreaks(record.breaks),
    deepWorkSessions: castDeepWorkSessions(record.deepWorkSessions),
    timeline: castTimeline(record.timeline),
    totalWorkMinutes: record.totalWorkMinutes,
    totalBreakMinutes: record.totalBreakMinutes,
    deepWorkMinutes: record.deepWorkMinutes,
    overtimeMinutes: record.overtimeMinutes,
    tasksCompleted: record.tasksCompleted,
    productivityScore: record.productivityScore,
    burnoutRisk: record.burnoutRisk as AttendanceInsightsDto['burnoutRisk'],
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function createDefaultRecord(date: string): AttendanceRecordDto {
  return {
    attendanceId: randomUUID(),
    date,
    checkIn: null,
    checkOut: null,
    status: 'absent',
    breaks: [],
    deepWorkSessions: [],
    timeline: [],
    totalWorkMinutes: 0,
    totalBreakMinutes: 0,
    deepWorkMinutes: 0,
    overtimeMinutes: 0,
    tasksCompleted: 0,
    productivityScore: 0,
    burnoutRisk: 'low',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function computeRecord(record: AttendanceRecordDto) {
  const now = new Date().toISOString();
  const checkOut = record.checkOut || (record.checkIn ? now : null);
  const totalElapsedMinutes = minutesBetween(record.checkIn, checkOut);

  const totalBreakMinutes = record.breaks.reduce(
    (sum, breakEntry) => sum + minutesBetween(breakEntry.start, breakEntry.end || now),
    0,
  );

  const deepWorkMinutes = record.deepWorkSessions.reduce(
    (sum, session) => sum + minutesBetween(session.start, session.end || now),
    0,
  );

  const totalWorkMinutes = Math.max(0, totalElapsedMinutes - totalBreakMinutes);
  const overtimeMinutes = Math.max(0, totalWorkMinutes - STANDARD_WORK_MINUTES);

  return {
    totalWorkMinutes,
    totalBreakMinutes,
    deepWorkMinutes,
    overtimeMinutes,
  };
}

function determineStatus(record: AttendanceRecordDto): AttendanceStatusValue {
  const { totalWorkMinutes } = computeRecord(record);
  if (!record.checkIn) {
    return 'absent';
  }
  if (totalWorkMinutes >= STANDARD_WORK_MINUTES * 0.5) {
    return 'present';
  }
  return 'half-day';
}

function calculateProductivityScore(record: AttendanceRecordDto, tasks: TaskDto[]) {
  const { totalWorkMinutes, totalBreakMinutes, deepWorkMinutes } = computeRecord(record);
  if (totalWorkMinutes === 0) {
    return 0;
  }

  const todayTasks = tasks.filter((task) => task.date === record.date);
  const completedTasks = todayTasks.filter((task) => task.status === 'completed');
  const completionRate = todayTasks.length > 0 ? completedTasks.length / todayTasks.length : 0;
  const workHoursScore = Math.min(1, totalWorkMinutes / STANDARD_WORK_MINUTES);
  const taskScore = completionRate;
  const deepWorkRatio = totalWorkMinutes > 0 ? Math.min(1, deepWorkMinutes / totalWorkMinutes) : 0;
  const breakRatio = totalWorkMinutes > 0 ? totalBreakMinutes / totalWorkMinutes : 0;
  const breakScore =
    breakRatio === 0
      ? 0.5
      : breakRatio <= IDEAL_BREAK_RATIO * 2
        ? 1
        : Math.max(0, 1 - (breakRatio - IDEAL_BREAK_RATIO * 2) * 5);

  return Math.min(
    100,
    Math.max(0, Math.round(workHoursScore * 35 + taskScore * 35 + deepWorkRatio * 20 + breakScore * 10)),
  );
}

function detectBurnoutRisk(record: AttendanceRecordDto, allRecords: AttendanceRecordDto[], tasks: TaskDto[]) {
  const { totalWorkMinutes, totalBreakMinutes } = computeRecord(record);
  const excessiveHoursToday = totalWorkMinutes > BURNOUT_HOURS_THRESHOLD;
  const overdueTasks = tasks.filter((task) => task.date < record.date && task.status !== 'completed');
  const highOverdue = overdueTasks.length >= 3;
  const todayTasks = tasks.filter((task) => task.date === record.date);
  const completedToday = todayTasks.filter((task) => task.status === 'completed');
  const lowCompletion = todayTasks.length > 0 && completedToday.length / todayTasks.length < 0.3;
  const breakRatio = totalWorkMinutes > 0 ? totalBreakMinutes / totalWorkMinutes : 0;
  const insufficientBreaks = totalWorkMinutes > 120 && breakRatio < 0.03;
  const last5 = allRecords
    .filter(
      (attendance: AttendanceRecordDto) =>
        attendance.date < record.date && attendance.date >= offsetDate(record.date, -5),
    )
    .map((attendance: AttendanceRecordDto) => computeRecord(attendance).totalWorkMinutes);
  const consecutiveOverload = last5.filter((minutes) => minutes > OVERTIME_THRESHOLD_MINUTES).length >= 3;

  const riskFactors = [
    excessiveHoursToday,
    highOverdue,
    lowCompletion,
    insufficientBreaks,
    consecutiveOverload,
  ].filter(Boolean).length;

  let burnoutRisk: AttendanceInsightsDto['burnoutRisk'] = 'low';
  const recommendations: string[] = [];

  if (riskFactors >= 3) {
    burnoutRisk = 'high';
    recommendations.push('Take a proper break — step away from the screen for 20+ minutes');
    recommendations.push('Defer non-critical tasks to tomorrow');
    recommendations.push('Avoid working beyond your scheduled hours today');
  } else if (riskFactors >= 2) {
    burnoutRisk = 'medium';
    recommendations.push('Schedule a short break in the next 30 minutes');
    recommendations.push('Review your task list and reprioritise');
  } else {
    recommendations.push("You're in a healthy work rhythm — keep it up");
  }

  if (insufficientBreaks) {
    recommendations.push('Take a 5-minute break every 90 minutes of focused work');
  }
  if (highOverdue) {
    recommendations.push(`You have ${overdueTasks.length} overdue tasks — tackle the highest priority one next`);
  }

  return {
    burnoutRisk,
    recommendations,
  };
}

function generateInsights(allRecords: AttendanceRecordDto[]) {
  const present = allRecords.filter((record) => record.checkIn);
  if (present.length === 0) {
    return {
      avgCheckInTime: null,
      avgWorkDuration: 0,
      avgBreakDuration: 0,
      mostProductiveWindow: null,
      currentStreak: 0,
      longestStreak: 0,
      overtimeFrequency: 0,
      consistencyScore: 0,
      totalDaysTracked: 0,
      totalWorkHours: 0,
    };
  }

  const checkInMinutes = present
    .filter((record) => record.checkIn)
    .map((record) => {
      const date = new Date(record.checkIn as string);
      return date.getHours() * 60 + date.getMinutes();
    });

  const avgCheckInMinutes = Math.round(
    checkInMinutes.reduce((sum, value) => sum + value, 0) / Math.max(checkInMinutes.length, 1),
  );
  const avgCheckInHour = Math.floor(avgCheckInMinutes / 60);
  const avgCheckInMinute = avgCheckInMinutes % 60;
  const avgCheckInTime = `${String(avgCheckInHour).padStart(2, '0')}:${String(avgCheckInMinute).padStart(2, '0')}`;

  const workDurations = present.map((record) => computeRecord(record).totalWorkMinutes);
  const breakDurations = present.map((record) => computeRecord(record).totalBreakMinutes);
  const avgWorkDuration = Math.round(workDurations.reduce((sum, value) => sum + value, 0) / present.length);
  const avgBreakDuration = Math.round(breakDurations.reduce((sum, value) => sum + value, 0) / present.length);

  const hourCounts = new Map<number, number>();
  for (const record of present) {
    for (const session of record.deepWorkSessions) {
      const hour = new Date(session.start).getHours();
      hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
    }
  }

  let mostProductiveWindow: string | null = null;
  if (hourCounts.size > 0) {
    const [topHourRaw] = [...hourCounts.entries()].sort((left, right) => right[1] - left[1])[0] ?? [];
    const topHour = Number(topHourRaw);
    const suffix = topHour >= 12 ? 'PM' : 'AM';
    const display = topHour > 12 ? topHour - 12 : topHour === 0 ? 12 : topHour;
    mostProductiveWindow = `${display}:00 ${suffix} – ${display + 1}:00 ${suffix}`;
  }

  const sortedDates = [...new Set(present.map((record) => record.date))].sort().reverse();
  const today = todayStr();

  let currentStreak = 0;
  for (let index = 0; index < sortedDates.length; index += 1) {
    if (sortedDates[index] === offsetDate(today, -index)) {
      currentStreak += 1;
    } else {
      break;
    }
  }

  let longestStreak = 0;
  let tempStreak = 0;
  let previousDate: string | null = null;
  for (const date of [...sortedDates].reverse()) {
    if (!previousDate || offsetDate(previousDate, 1) === date) {
      tempStreak += 1;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 1;
    }
    previousDate = date;
  }

  const overtimeDays = present.filter((record) => computeRecord(record).overtimeMinutes > 0).length;
  const overtimeFrequency = Math.round((overtimeDays / present.length) * 100);
  const last30 = Array.from({ length: 30 }, (_, index) => offsetDate(today, -index));
  const attendedLast30 = last30.filter((date) => present.some((record) => record.date === date)).length;
  const consistencyScore = Math.round((attendedLast30 / 30) * 100);
  const totalWorkHours = Math.round((workDurations.reduce((sum, value) => sum + value, 0) / 60) * 10) / 10;

  return {
    avgCheckInTime,
    avgWorkDuration,
    avgBreakDuration,
    mostProductiveWindow,
    currentStreak,
    longestStreak,
    overtimeFrequency,
    consistencyScore,
    totalDaysTracked: present.length,
    totalWorkHours,
  };
}

function generateCalendarData(allRecords: AttendanceRecordDto[], months = 2): CalendarMonthDto[] {
  const today = new Date();
  const result: CalendarMonthDto[] = [];

  for (let monthOffset = months - 1; monthOffset >= 0; monthOffset -= 1) {
    const date = new Date(today.getFullYear(), today.getMonth() - monthOffset, 1);
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const record = allRecords.find((attendance: AttendanceRecordDto) => attendance.date === dateStr);
      let status: AttendanceStatusValue = 'no-data';
      if (record) {
        status = determineStatus(record);
      } else if (dateStr <= todayStr()) {
        status = 'absent';
      }
      days.push({
        date: dateStr,
        status,
      });
    }

    result.push({
      year,
      month,
      monthName: date.toLocaleString('en-US', { month: 'long' }),
      days,
    });
  }

  return result;
}

function generateWeeklyStats(allRecords: AttendanceRecordDto[]): AttendanceWeeklyStatDto[] {
  const today = todayStr();
  return Array.from({ length: 7 }, (_, index) => {
    const date = offsetDate(today, -(6 - index));
    const record = allRecords.find((attendance: AttendanceRecordDto) => attendance.date === date);
    const computed = record ? computeRecord(record) : null;
    return {
      date,
      workMinutes: computed?.totalWorkMinutes ?? 0,
      breakMinutes: computed?.totalBreakMinutes ?? 0,
      deepWorkMinutes: computed?.deepWorkMinutes ?? 0,
      overtimeMinutes: computed?.overtimeMinutes ?? 0,
      productivityScore: record?.productivityScore ?? 0,
      status: record ? determineStatus(record) : 'absent',
    };
  });
}

async function getAllRecords(userId: string) {
  const records = await prisma.attendance.findMany({
    where: { userId },
    orderBy: [{ date: 'desc' }],
  });

  return records.map(serializeAttendance);
}

async function persistRecord(userId: string, record: AttendanceRecordDto) {
  const existing = await prisma.attendance.findFirst({
    where: { userId, date: record.date },
  });

  if (existing) {
    await prisma.attendance.update({
      where: { id: existing.id },
      data: {
        checkIn: record.checkIn ? new Date(record.checkIn) : null,
        checkOut: record.checkOut ? new Date(record.checkOut) : null,
        status: record.status,
        breaks: toJsonValue(record.breaks),
        deepWorkSessions: toJsonValue(record.deepWorkSessions),
        timeline: toJsonValue(record.timeline),
        totalWorkMinutes: record.totalWorkMinutes,
        totalBreakMinutes: record.totalBreakMinutes,
        deepWorkMinutes: record.deepWorkMinutes,
        overtimeMinutes: record.overtimeMinutes,
        tasksCompleted: record.tasksCompleted,
        productivityScore: record.productivityScore,
        burnoutRisk: record.burnoutRisk,
        updatedAt: new Date(),
      },
    });
  } else {
    await prisma.attendance.create({
      data: {
        id: record.attendanceId,
        userId,
        date: record.date,
        checkIn: record.checkIn ? new Date(record.checkIn) : null,
        checkOut: record.checkOut ? new Date(record.checkOut) : null,
        status: record.status,
        breaks: toJsonValue(record.breaks),
        deepWorkSessions: toJsonValue(record.deepWorkSessions),
        timeline: toJsonValue(record.timeline),
        totalWorkMinutes: record.totalWorkMinutes,
        totalBreakMinutes: record.totalBreakMinutes,
        deepWorkMinutes: record.deepWorkMinutes,
        overtimeMinutes: record.overtimeMinutes,
        tasksCompleted: record.tasksCompleted,
        productivityScore: record.productivityScore,
        burnoutRisk: record.burnoutRisk,
        createdAt: new Date(record.createdAt),
      },
    });
  }
}

async function refreshComputedFields(userId: string, record: AttendanceRecordDto, tasks: TaskDto[], allRecords?: AttendanceRecordDto[]) {
  const computed = computeRecord(record);
  record.totalWorkMinutes = computed.totalWorkMinutes;
  record.totalBreakMinutes = computed.totalBreakMinutes;
  record.deepWorkMinutes = computed.deepWorkMinutes;
  record.overtimeMinutes = computed.overtimeMinutes;
  record.status = determineStatus(record);
  record.tasksCompleted = tasks.filter((task) => task.date === record.date && task.status === 'completed').length;
  record.productivityScore = calculateProductivityScore(record, tasks);
  const history = allRecords ?? (await getAllRecords(userId));
  record.burnoutRisk = detectBurnoutRisk(record, history, tasks).burnoutRisk;
  record.updatedAt = new Date().toISOString();
}

async function getOrCreateToday(userId: string) {
  const today = todayStr();
  const record = await prisma.attendance.findFirst({
    where: { userId, date: today },
  });

  if (record) {
    return serializeAttendance(record);
  }

  const created = createDefaultRecord(today);
  await persistRecord(userId, created);
  return created;
}

function addTimeline(record: AttendanceRecordDto, action: TimelineEntryDto['action']) {
  record.timeline.push({
    time: new Date().toISOString(),
    action,
  });
}

async function updateTodayRecord(
  userId: string,
  updater: (record: AttendanceRecordDto) => void,
) {
  const tasks = await listTasks(userId);
  const history = await getAllRecords(userId);
  const record =
    history.find((attendance: AttendanceRecordDto) => attendance.date === todayStr()) ??
    (await getOrCreateToday(userId));
  if (!history.some((attendance: AttendanceRecordDto) => attendance.attendanceId === record.attendanceId)) {
    history.push(record);
  }

  updater(record);
  await refreshComputedFields(userId, record, tasks, history);
  await persistRecord(userId, record);
  return record;
}

export async function getTodayAttendance(userId: string) {
  const record = await getOrCreateToday(userId);
  const tasks = await listTasks(userId);
  const history = await getAllRecords(userId);
  if (!history.some((attendance: AttendanceRecordDto) => attendance.attendanceId === record.attendanceId)) {
    history.push(record);
  }
  await refreshComputedFields(userId, record, tasks, history);
  await persistRecord(userId, record);
  return record;
}

export async function getAttendanceHistory(userId: string) {
  return getAllRecords(userId);
}

export async function checkInUser(userId: string) {
  return updateTodayRecord(userId, (record) => {
    if (record.checkIn) {
      throw new Error('Already checked in today');
    }
    record.checkIn = new Date().toISOString();
    addTimeline(record, 'check-in');
  });
}

export async function checkOutUser(userId: string) {
  return updateTodayRecord(userId, (record) => {
    if (!record.checkIn) {
      throw new Error('Not checked in yet');
    }
    if (record.checkOut) {
      throw new Error('Already checked out today');
    }

    const activeBreak = record.breaks.find((breakEntry) => !breakEntry.end);
    if (activeBreak) {
      activeBreak.end = new Date().toISOString();
    }

    const activeSession = record.deepWorkSessions.find((session) => !session.end);
    if (activeSession) {
      activeSession.end = new Date().toISOString();
    }

    record.checkOut = new Date().toISOString();
    addTimeline(record, 'check-out');
  });
}

export async function startBreakForUser(userId: string, type: BreakTypeValue) {
  return updateTodayRecord(userId, (record) => {
    if (!record.checkIn) {
      throw new Error('Not checked in');
    }
    if (record.checkOut) {
      throw new Error('Session already ended');
    }
    if (record.breaks.some((breakEntry) => !breakEntry.end)) {
      throw new Error('A break is already in progress');
    }

    record.breaks.push({
      breakId: randomUUID(),
      start: new Date().toISOString(),
      end: null,
      type,
    });
    addTimeline(record, 'break-start');
  });
}

export async function endBreakForUser(userId: string) {
  return updateTodayRecord(userId, (record) => {
    const activeBreak = record.breaks.find((breakEntry) => !breakEntry.end);
    if (!activeBreak) {
      throw new Error('No active break to end');
    }

    activeBreak.end = new Date().toISOString();
    addTimeline(record, 'break-end');
  });
}

export async function startDeepWorkForUser(userId: string) {
  return updateTodayRecord(userId, (record) => {
    if (!record.checkIn) {
      throw new Error('Not checked in');
    }
    if (record.checkOut) {
      throw new Error('Session already ended');
    }
    if (record.deepWorkSessions.some((session) => !session.end)) {
      throw new Error('Deep work session already active');
    }

    record.deepWorkSessions.push({
      sessionId: randomUUID(),
      start: new Date().toISOString(),
      end: null,
    });
    addTimeline(record, 'deep-work-start');
  });
}

export async function endDeepWorkForUser(userId: string) {
  return updateTodayRecord(userId, (record) => {
    const activeSession = record.deepWorkSessions.find((session) => !session.end);
    if (!activeSession) {
      throw new Error('No active deep work session');
    }

    activeSession.end = new Date().toISOString();
    addTimeline(record, 'deep-work-end');
  });
}

export async function getAttendanceStats(userId: string): Promise<AttendanceStatsDto> {
  const records = await getAllRecords(userId);
  return {
    weeklyStats: generateWeeklyStats(records),
    insights: generateInsights(records),
  };
}

export async function getAttendanceCalendar(userId: string, months = 2) {
  const records = await getAllRecords(userId);
  return generateCalendarData(records, months);
}

export async function getAttendanceInsights(userId: string) {
  const records = await getAllRecords(userId);
  const tasks = await listTasks(userId);
  const insights = generateInsights(records);
  const todayRecord = records.find((record: AttendanceRecordDto) => record.date === todayStr());
  const burnout = todayRecord
    ? detectBurnoutRisk(todayRecord, records, tasks)
    : {
        burnoutRisk: 'low' as const,
        recommendations: [] as string[],
      };

  return {
    ...insights,
    ...burnout,
  };
}
