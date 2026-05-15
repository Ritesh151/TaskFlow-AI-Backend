"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attendanceRouter = void 0;
const express_1 = require("express");
const asyncHandler_1 = require("../middleware/asyncHandler");
const authenticate_1 = require("../middleware/authenticate");
const validate_1 = require("../middleware/validate");
const errors_1 = require("../lib/errors");
const response_1 = require("../lib/response");
const attendance_service_1 = require("../services/attendance.service");
const attendance_validator_1 = require("../validators/attendance.validator");
function normalizeAttendanceError(error) {
    if (error instanceof Error) {
        return new errors_1.AppError(error.message, 400, 'ATTENDANCE_ACTION_FAILED');
    }
    return error;
}
exports.attendanceRouter = (0, express_1.Router)();
exports.attendanceRouter.use(authenticate_1.requireAuth);
exports.attendanceRouter.get('/today', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    return (0, response_1.sendSuccess)(response, await (0, attendance_service_1.getTodayAttendance)(request.auth.sub));
}));
exports.attendanceRouter.get('/history', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    return (0, response_1.sendSuccess)(response, await (0, attendance_service_1.getAttendanceHistory)(request.auth.sub));
}));
exports.attendanceRouter.post('/check-in', (0, asyncHandler_1.asyncHandler)(async (request, response, next) => {
    try {
        return (0, response_1.sendSuccess)(response, await (0, attendance_service_1.checkInUser)(request.auth.sub));
    }
    catch (error) {
        next(normalizeAttendanceError(error));
    }
}));
exports.attendanceRouter.post('/check-out', (0, asyncHandler_1.asyncHandler)(async (request, response, next) => {
    try {
        return (0, response_1.sendSuccess)(response, await (0, attendance_service_1.checkOutUser)(request.auth.sub));
    }
    catch (error) {
        next(normalizeAttendanceError(error));
    }
}));
exports.attendanceRouter.post('/break/start', (0, validate_1.validate)({ body: attendance_validator_1.breakActionSchema }), (0, asyncHandler_1.asyncHandler)(async (request, response, next) => {
    try {
        return (0, response_1.sendSuccess)(response, await (0, attendance_service_1.startBreakForUser)(request.auth.sub, request.body.type));
    }
    catch (error) {
        next(normalizeAttendanceError(error));
    }
}));
exports.attendanceRouter.post('/break/end', (0, asyncHandler_1.asyncHandler)(async (request, response, next) => {
    try {
        return (0, response_1.sendSuccess)(response, await (0, attendance_service_1.endBreakForUser)(request.auth.sub));
    }
    catch (error) {
        next(normalizeAttendanceError(error));
    }
}));
exports.attendanceRouter.post('/deep-work/start', (0, asyncHandler_1.asyncHandler)(async (request, response, next) => {
    try {
        return (0, response_1.sendSuccess)(response, await (0, attendance_service_1.startDeepWorkForUser)(request.auth.sub));
    }
    catch (error) {
        next(normalizeAttendanceError(error));
    }
}));
exports.attendanceRouter.post('/deep-work/end', (0, asyncHandler_1.asyncHandler)(async (request, response, next) => {
    try {
        return (0, response_1.sendSuccess)(response, await (0, attendance_service_1.endDeepWorkForUser)(request.auth.sub));
    }
    catch (error) {
        next(normalizeAttendanceError(error));
    }
}));
exports.attendanceRouter.get('/stats', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    return (0, response_1.sendSuccess)(response, await (0, attendance_service_1.getAttendanceStats)(request.auth.sub));
}));
exports.attendanceRouter.get('/calendar', (0, validate_1.validate)({ query: attendance_validator_1.calendarQuerySchema }), (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    return (0, response_1.sendSuccess)(response, await (0, attendance_service_1.getAttendanceCalendar)(request.auth.sub, typeof request.query.months === 'number' ? request.query.months : undefined));
}));
exports.attendanceRouter.get('/insights', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    return (0, response_1.sendSuccess)(response, await (0, attendance_service_1.getAttendanceInsights)(request.auth.sub));
}));
