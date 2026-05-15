"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOverdue = isOverdue;
exports.getNextBestTask = getNextBestTask;
exports.analyzeWorkload = analyzeWorkload;
exports.generateDailySummary = generateDailySummary;
exports.buildInsights = buildInsights;
const dates_1 = require("../utils/dates");
const OVERLOAD_THRESHOLD = 8;
const PRIORITY_WEIGHT = {
    high: 3,
    medium: 2,
    low: 1,
};
function isOpenTask(task) {
    return task.status !== 'completed';
}
function isOverdue(task) {
    return task.date < (0, dates_1.todayStr)() && isOpenTask(task);
}
function scoreTask(task) {
    let score = 0;
    const today = (0, dates_1.todayStr)();
    if (isOverdue(task)) {
        score += 100;
    }
    if (task.date === today) {
        score += 50;
    }
    score += (PRIORITY_WEIGHT[task.priority] ?? 1) * 20;
    score += Math.max(0, 5 - task.duration) * 2;
    const ageMs = Date.now() - new Date(task.createdAt).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    score += Math.max(0, 10 - ageDays);
    return score;
}
function getNextBestTask(tasks) {
    const pending = tasks.filter((task) => task.status === 'pending' || task.status === 'in_progress');
    if (pending.length === 0) {
        return null;
    }
    const scored = pending.map((task) => ({
        task,
        score: scoreTask(task),
    }));
    scored.sort((left, right) => right.score - left.score);
    const best = scored[0]?.task;
    if (!best) {
        return null;
    }
    let reason = 'Next in queue by priority';
    if (isOverdue(best)) {
        reason = 'Overdue task — needs immediate attention';
    }
    else if (best.date === (0, dates_1.todayStr)() && best.priority === 'high') {
        reason = 'High priority + due today';
    }
    else if (best.date === (0, dates_1.todayStr)()) {
        reason = 'Due today';
    }
    else if (best.priority === 'high') {
        reason = 'High priority task';
    }
    else if (best.duration <= 1) {
        reason = 'Quick win — short duration task';
    }
    return {
        task: best,
        reason,
    };
}
function analyzeWorkload(tasks, date) {
    const dayTasks = tasks.filter((task) => task.date === date);
    const pendingTasks = dayTasks.filter((task) => task.status !== 'completed');
    const completedTasks = dayTasks.filter((task) => task.status === 'completed');
    const totalHours = dayTasks.reduce((sum, task) => sum + task.duration, 0);
    const pendingHours = pendingTasks.reduce((sum, task) => sum + task.duration, 0);
    const completedHours = completedTasks.reduce((sum, task) => sum + task.duration, 0);
    const overdueTasks = tasks.filter((task) => isOverdue(task));
    const isOverloaded = totalHours > OVERLOAD_THRESHOLD;
    const overloadPercent = Math.min(100, Math.round((totalHours / OVERLOAD_THRESHOLD) * 100));
    let status = 'normal';
    let message = `Manageable workload today (${totalHours.toFixed(1)} hours). You're on track.`;
    let suggestions = [];
    if (totalHours === 0) {
        status = 'empty';
        message = 'No tasks scheduled for today. Add some tasks to get started.';
    }
    else if (totalHours > OVERLOAD_THRESHOLD) {
        status = 'overloaded';
        message = `You are overloaded today (${totalHours.toFixed(1)} hours assigned)`;
        suggestions = [
            'Move low priority tasks to tomorrow',
            'Focus on top 2 critical tasks',
            'Consider delegating or deferring medium priority items',
        ];
    }
    else if (totalHours > OVERLOAD_THRESHOLD * 0.75) {
        status = 'heavy';
        message = `Heavy workload today (${totalHours.toFixed(1)} hours). Stay focused.`;
        suggestions = [
            'Prioritize high-priority tasks first',
            'Take short breaks between tasks',
        ];
    }
    return {
        date,
        totalHours,
        pendingHours,
        completedHours,
        totalTasks: dayTasks.length,
        pendingCount: pendingTasks.length,
        completedCount: completedTasks.length,
        overdueCount: overdueTasks.length,
        isOverloaded,
        overloadPercent,
        status,
        message,
        suggestions,
    };
}
function generateDailySummary(tasks, date) {
    const dayTasks = tasks.filter((task) => task.date === date);
    const completed = dayTasks.filter((task) => task.status === 'completed');
    const pending = dayTasks.filter((task) => task.status !== 'completed');
    const totalTime = dayTasks.reduce((sum, task) => sum + task.duration, 0);
    const completedTime = completed.reduce((sum, task) => sum + task.duration, 0);
    const completionRate = dayTasks.length > 0 ? Math.round((completed.length / dayTasks.length) * 100) : 0;
    let smartSummary = 'No tasks were scheduled for today. Plan your tasks for tomorrow to stay productive.';
    if (dayTasks.length === 0) {
        smartSummary = 'No tasks were scheduled for today. Plan your tasks for tomorrow to stay productive.';
    }
    else if (completionRate === 100) {
        smartSummary =
            "Outstanding! All tasks completed today. You're at peak productivity. Keep the momentum going tomorrow.";
    }
    else if (completionRate >= 75) {
        smartSummary = `Great progress today! ${completionRate}% completion rate. Focus on the remaining ${pending.length} task(s) first thing tomorrow.`;
    }
    else if (completionRate >= 50) {
        const highPriorityPending = pending.filter((task) => task.priority === 'high');
        smartSummary =
            highPriorityPending.length > 0
                ? `Decent progress today. Prioritize the ${highPriorityPending.length} high-priority pending task(s) tomorrow morning.`
                : `Good progress today. ${completionRate}% done. Plan to tackle pending tasks early tomorrow.`;
    }
    else if (completionRate > 0) {
        smartSummary = `Challenging day. Only ${completionRate}% completed. Consider breaking large tasks into smaller chunks tomorrow.`;
    }
    else {
        smartSummary = 'No tasks completed today. Review your task list and start with the highest priority item tomorrow.';
    }
    const productivityScore = Math.min(100, Math.round(completionRate * 0.6 + (Math.min(completedTime, 8) / 8) * 100 * 0.4));
    return {
        date,
        completed,
        pending,
        totalTime,
        completedTime,
        completionRate,
        productivityScore,
        smartSummary,
        generatedAt: new Date().toISOString(),
    };
}
function buildInsights(tasks) {
    const last7Days = Array.from({ length: 7 }, (_, index) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - index));
        return date.toISOString().split('T')[0] ?? '';
    });
    const weeklyData = last7Days.map((date) => {
        const dayTasks = tasks.filter((task) => task.date === date);
        const completed = dayTasks.filter((task) => task.status === 'completed');
        return {
            date,
            total: dayTasks.length,
            completed: completed.length,
            hours: dayTasks.reduce((sum, task) => sum + task.duration, 0),
            completedHours: completed.reduce((sum, task) => sum + task.duration, 0),
        };
    });
    const allPending = tasks.filter((task) => task.status !== 'completed');
    const priorityBreakdown = {
        high: allPending.filter((task) => task.priority === 'high').length,
        medium: allPending.filter((task) => task.priority === 'medium').length,
        low: allPending.filter((task) => task.priority === 'low').length,
    };
    const technologyCount = new Map();
    for (const task of tasks) {
        for (const technology of task.technologies) {
            technologyCount.set(technology, (technologyCount.get(technology) ?? 0) + 1);
        }
    }
    const topTechnologies = [...technologyCount.entries()]
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((task) => task.status === 'completed').length;
    const overdueTasks = tasks.filter((task) => isOverdue(task)).length;
    const overallCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    return {
        weeklyData,
        priorityBreakdown,
        topTechnologies,
        totalTasks,
        completedTasks,
        overdueTasks,
        overallCompletionRate,
    };
}
