import { randomUUID } from 'node:crypto';
import { prisma } from '../lib/prisma';
import { notFound } from '../lib/errors';
import type { TaskDto, TaskPriorityValue, TaskStatusValue } from '../types/domain';
import type { PersistedTask } from '../types/persistence';
import { uniqueStrings } from '../utils/strings';

type TaskMutation = {
  taskName: string;
  date: string;
  duration: number;
  priority: TaskPriorityValue;
  status?: TaskStatusValue;
  client?: string;
  technologies?: string[];
  tags?: string[];
  startTime?: string | null;
  endTime?: string | null;
  manualTimeOverride?: boolean;
};

function toIsoOrNull(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function getTotalMinutes(startTime: string | null, endTime: string | null) {
  if (!startTime || !endTime) {
    return null;
  }

  const diff = new Date(endTime).getTime() - new Date(startTime).getTime();
  if (diff < 0) {
    return null;
  }

  return Math.floor(diff / 60000);
}

function buildTaskData(input: TaskMutation) {
  const nowIso = new Date().toISOString();
  const startTime = toIsoOrNull(input.startTime);
  let endTime = toIsoOrNull(input.endTime);
  let status = input.status ?? 'pending';

  if (!startTime && endTime) {
    endTime = null;
  }

  if (startTime && endTime && new Date(endTime).getTime() < new Date(startTime).getTime()) {
    endTime = null;
  }

  const orderedRange =
    Boolean(startTime) &&
    Boolean(endTime) &&
    new Date(endTime ?? nowIso).getTime() >= new Date(startTime ?? nowIso).getTime();

  if (orderedRange) {
    status = 'completed';
  } else if (startTime && !endTime) {
    status = 'in_progress';
  }

  if (status === 'completed' && !endTime) {
    endTime = nowIso;
  }

  const totalTimeSpent = getTotalMinutes(startTime, endTime);

  return {
    taskName: input.taskName.trim(),
    date: input.date,
    duration: Number(input.duration),
    priority: input.priority,
    status,
    client: input.client?.trim() ?? '',
    technologies: uniqueStrings(input.technologies ?? []),
    tags: uniqueStrings(input.tags ?? []),
    startTime: startTime ? new Date(startTime) : null,
    endTime: endTime ? new Date(endTime) : null,
    totalTimeSpent,
    isTimeTracked: Boolean(startTime || endTime),
    manualTimeOverride: input.manualTimeOverride ?? false,
  };
}

export function serializeTask(task: PersistedTask): TaskDto {
  return {
    taskId: task.id,
    taskName: task.taskName,
    date: task.date,
    duration: task.duration,
    status: task.status,
    priority: task.priority,
    client: task.client,
    technologies: task.technologies,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    startTime: task.startTime?.toISOString() ?? null,
    endTime: task.endTime?.toISOString() ?? null,
    totalTimeSpent: task.totalTimeSpent,
    tags: task.tags,
    isTimeTracked: task.isTimeTracked,
    manualTimeOverride: task.manualTimeOverride,
  };
}

export async function listTasks(userId: string) {
  const tasks = await prisma.task.findMany({
    where: { userId },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  });

  return tasks.map(serializeTask);
}

export async function listTasksByDate(userId: string, date: string) {
  const tasks = await prisma.task.findMany({
    where: {
      userId,
      date,
    },
    orderBy: [{ createdAt: 'desc' }],
  });

  return tasks.map(serializeTask);
}

export async function getTaskById(userId: string, id: string) {
  const task = await prisma.task.findFirst({
    where: {
      id,
      userId,
    },
  });

  if (!task) {
    throw notFound('Task not found');
  }

  return serializeTask(task);
}

export async function createTask(userId: string, input: TaskMutation) {
  const task = await prisma.task.create({
    data: {
      id: randomUUID(),
      userId,
      ...buildTaskData(input),
    },
  });

  return serializeTask(task);
}

export async function updateTask(userId: string, id: string, input: Partial<TaskMutation>) {
  const existing = await prisma.task.findFirst({
    where: {
      id,
      userId,
    },
  });

  if (!existing) {
    throw notFound('Task not found');
  }

  const current = serializeTask(existing);
  const task = await prisma.task.update({
    where: { id: existing.id },
    data: buildTaskData({
      taskName: input.taskName ?? current.taskName,
      date: input.date ?? current.date,
      duration: input.duration ?? current.duration,
      priority: input.priority ?? current.priority,
      status: input.status ?? current.status,
      client: input.client ?? current.client,
      technologies: input.technologies ?? current.technologies,
      tags: input.tags ?? current.tags ?? [],
      startTime: input.startTime === undefined ? current.startTime : input.startTime,
      endTime: input.endTime === undefined ? current.endTime : input.endTime,
      manualTimeOverride:
        input.manualTimeOverride === undefined
          ? current.manualTimeOverride ?? false
          : input.manualTimeOverride,
    }),
  });

  return serializeTask(task);
}

export async function completeTask(userId: string, id: string) {
  const existing = await prisma.task.findFirst({
    where: {
      id,
      userId,
    },
  });

  if (!existing) {
    throw notFound('Task not found');
  }

  const current = serializeTask(existing);
  const task = await prisma.task.update({
    where: { id: existing.id },
    data: buildTaskData({
      taskName: current.taskName,
      date: current.date,
      duration: current.duration,
      priority: current.priority,
      status: 'completed',
      client: current.client,
      technologies: current.technologies,
      tags: current.tags ?? [],
      startTime: current.startTime,
      endTime: current.endTime ?? new Date().toISOString(),
      manualTimeOverride: current.manualTimeOverride ?? false,
    }),
  });

  return serializeTask(task);
}

export async function deleteTask(userId: string, id: string) {
  const existing = await prisma.task.findFirst({
    where: {
      id,
      userId,
    },
  });

  if (!existing) {
    throw notFound('Task not found');
  }

  await prisma.task.delete({
    where: { id: existing.id },
  });
}
