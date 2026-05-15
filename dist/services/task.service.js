"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeTask = serializeTask;
exports.listTasks = listTasks;
exports.listTasksByDate = listTasksByDate;
exports.getTaskById = getTaskById;
exports.createTask = createTask;
exports.updateTask = updateTask;
exports.completeTask = completeTask;
exports.deleteTask = deleteTask;
const prisma_1 = require("../lib/prisma");
const errors_1 = require("../lib/errors");
const strings_1 = require("../utils/strings");
function toIsoOrNull(value) {
    if (!value) {
        return null;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
function getTotalMinutes(startTime, endTime) {
    if (!startTime || !endTime) {
        return null;
    }
    const diff = new Date(endTime).getTime() - new Date(startTime).getTime();
    if (diff < 0) {
        return null;
    }
    return Math.floor(diff / 60000);
}
function buildTaskData(input) {
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
    const orderedRange = Boolean(startTime) &&
        Boolean(endTime) &&
        new Date(endTime ?? nowIso).getTime() >= new Date(startTime ?? nowIso).getTime();
    if (orderedRange) {
        status = 'completed';
    }
    else if (startTime && !endTime) {
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
        technologies: (0, strings_1.uniqueStrings)(input.technologies ?? []),
        tags: (0, strings_1.uniqueStrings)(input.tags ?? []),
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        totalTimeSpent,
        isTimeTracked: Boolean(startTime || endTime),
        manualTimeOverride: input.manualTimeOverride ?? false,
    };
}
function serializeTask(task) {
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
async function listTasks(userId) {
    const tasks = await prisma_1.prisma.task.findMany({
        where: { userId },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
    return tasks.map(serializeTask);
}
async function listTasksByDate(userId, date) {
    const tasks = await prisma_1.prisma.task.findMany({
        where: {
            userId,
            date,
        },
        orderBy: [{ createdAt: 'desc' }],
    });
    return tasks.map(serializeTask);
}
async function getTaskById(userId, id) {
    const task = await prisma_1.prisma.task.findFirst({
        where: {
            id,
            userId,
        },
    });
    if (!task) {
        throw (0, errors_1.notFound)('Task not found');
    }
    return serializeTask(task);
}
async function createTask(userId, input) {
    const task = await prisma_1.prisma.task.create({
        data: {
            userId,
            ...buildTaskData(input),
        },
    });
    return serializeTask(task);
}
async function updateTask(userId, id, input) {
    const existing = await prisma_1.prisma.task.findFirst({
        where: {
            id,
            userId,
        },
    });
    if (!existing) {
        throw (0, errors_1.notFound)('Task not found');
    }
    const current = serializeTask(existing);
    const task = await prisma_1.prisma.task.update({
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
            manualTimeOverride: input.manualTimeOverride === undefined
                ? current.manualTimeOverride ?? false
                : input.manualTimeOverride,
        }),
    });
    return serializeTask(task);
}
async function completeTask(userId, id) {
    const existing = await prisma_1.prisma.task.findFirst({
        where: {
            id,
            userId,
        },
    });
    if (!existing) {
        throw (0, errors_1.notFound)('Task not found');
    }
    const current = serializeTask(existing);
    const task = await prisma_1.prisma.task.update({
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
async function deleteTask(userId, id) {
    const existing = await prisma_1.prisma.task.findFirst({
        where: {
            id,
            userId,
        },
    });
    if (!existing) {
        throw (0, errors_1.notFound)('Task not found');
    }
    await prisma_1.prisma.task.delete({
        where: { id: existing.id },
    });
}
