"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.todayStr = todayStr;
exports.offsetDate = offsetDate;
exports.minutesBetween = minutesBetween;
function todayStr() {
    return new Date().toISOString().split('T')[0] ?? '';
}
function offsetDate(dateStr, days) {
    const date = new Date(`${dateStr}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().split('T')[0] ?? '';
}
function minutesBetween(start, end) {
    if (!start || !end) {
        return 0;
    }
    return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
}
