import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { type Prisma, BrainCategory, PrismaClient, TaskPriority, TaskStatus } from '@prisma/client';
import { env } from '../src/config/env';

const prisma = new PrismaClient();

type LegacyTask = {
  taskId: string;
  taskName: string;
  date: string;
  duration: number;
  status?: TaskStatus;
  priority: TaskPriority;
  client?: string;
  technologies?: string[];
  tags?: string[];
  startTime?: string | null;
  endTime?: string | null;
  totalTimeSpent?: number | null;
  isTimeTracked?: boolean;
  manualTimeOverride?: boolean;
  createdAt?: string;
};

type LegacyAttendance = {
  attendanceId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  breaks: unknown[];
  deepWorkSessions: unknown[];
  timeline: unknown[];
  totalWorkMinutes: number;
  totalBreakMinutes: number;
  deepWorkMinutes: number;
  overtimeMinutes: number;
  tasksCompleted: number;
  productivityScore: number;
  burnoutRisk: string;
  createdAt?: string;
};

type LegacyBrainNote = {
  brainId: string;
  title: string;
  content: string;
  category?: BrainCategory;
  tags?: string[];
  keywords?: string[];
  relatedNotes?: unknown[];
  relatedTasks?: unknown[];
  favorite?: boolean;
  pinned?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

function resolveDataPath(filename: string) {
  return path.join(process.cwd(), 'data', filename);
}

async function readJsonFile<T>(filename: string): Promise<T[]> {
  try {
    const raw = await readFile(resolveDataPath(filename), 'utf8');
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

async function main() {
  const passwordHash = await bcrypt.hash(env.SEED_USER_PASSWORD, env.BCRYPT_SALT_ROUNDS);

  const user = await prisma.user.upsert({
    where: { email: env.SEED_USER_EMAIL },
    update: {
      name: env.SEED_USER_NAME,
      passwordHash,
    },
    create: {
      id: randomUUID(),
      email: env.SEED_USER_EMAIL,
      name: env.SEED_USER_NAME,
      passwordHash,
      role: 'owner',
    },
  });

  const [taskCount, attendanceCount, noteCount] = await Promise.all([
    prisma.task.count({ where: { userId: user.id } }),
    prisma.attendance.count({ where: { userId: user.id } }),
    prisma.brainNote.count({ where: { userId: user.id } }),
  ]);

  if (taskCount === 0) {
    const tasks = await readJsonFile<LegacyTask>('tasks.json');
    if (tasks.length > 0) {
      await prisma.$transaction(
        tasks.map((task) =>
          prisma.task.create({
            data: {
              id: task.taskId,
              userId: user.id,
              taskName: task.taskName,
              date: task.date,
              duration: Number(task.duration) || 0,
              status: task.status ?? TaskStatus.pending,
              priority: task.priority,
              client: task.client ?? '',
              technologies: task.technologies ?? [],
              tags: task.tags ?? [],
              startTime: task.startTime ? new Date(task.startTime) : null,
              endTime: task.endTime ? new Date(task.endTime) : null,
              totalTimeSpent: task.totalTimeSpent ?? null,
              isTimeTracked: task.isTimeTracked ?? Boolean(task.startTime || task.endTime),
              manualTimeOverride: task.manualTimeOverride ?? false,
              createdAt: task.createdAt ? new Date(task.createdAt) : new Date(),
            },
          }),
        ),
      );
    }
  }

  if (attendanceCount === 0) {
    const attendances = await readJsonFile<LegacyAttendance>('attendance.json');
    if (attendances.length > 0) {
      await prisma.$transaction(
        attendances.map((record) =>
          prisma.attendance.create({
            data: {
              id: record.attendanceId,
              userId: user.id,
              date: record.date,
              checkIn: record.checkIn ? new Date(record.checkIn) : null,
              checkOut: record.checkOut ? new Date(record.checkOut) : null,
              status: record.status,
              breaks: record.breaks as Prisma.InputJsonValue,
              deepWorkSessions: record.deepWorkSessions as Prisma.InputJsonValue,
              timeline: record.timeline as Prisma.InputJsonValue,
              totalWorkMinutes: record.totalWorkMinutes,
              totalBreakMinutes: record.totalBreakMinutes,
              deepWorkMinutes: record.deepWorkMinutes,
              overtimeMinutes: record.overtimeMinutes,
              tasksCompleted: record.tasksCompleted,
              productivityScore: record.productivityScore,
              burnoutRisk: record.burnoutRisk,
              createdAt: record.createdAt ? new Date(record.createdAt) : new Date(),
            },
          }),
        ),
      );
    }
  }

  if (noteCount === 0) {
    const notes = await readJsonFile<LegacyBrainNote>('brain.json');
    if (notes.length > 0) {
      await prisma.$transaction(
        notes.map((note) =>
          prisma.brainNote.create({
            data: {
              id: note.brainId,
              userId: user.id,
              title: note.title,
              content: note.content,
              category: note.category ?? BrainCategory.thought,
              tags: note.tags ?? [],
              keywords: note.keywords ?? [],
              relatedNotes: note.relatedNotes as Prisma.InputJsonValue,
              relatedTasks: note.relatedTasks as Prisma.InputJsonValue,
              favorite: note.favorite ?? false,
              pinned: note.pinned ?? false,
              createdAt: note.createdAt ? new Date(note.createdAt) : new Date(),
              updatedAt: note.updatedAt ? new Date(note.updatedAt) : new Date(),
            },
          }),
        ),
      );
    }
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
