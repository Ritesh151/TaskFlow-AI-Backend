"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.intelligenceRouter = void 0;
const express_1 = require("express");
const asyncHandler_1 = require("../middleware/asyncHandler");
const authenticate_1 = require("../middleware/authenticate");
const validate_1 = require("../middleware/validate");
const response_1 = require("../lib/response");
const intelligence_service_1 = require("../services/intelligence.service");
const task_service_1 = require("../services/task.service");
const intelligence_validator_1 = require("../validators/intelligence.validator");
const dates_1 = require("../utils/dates");
exports.intelligenceRouter = (0, express_1.Router)();
exports.intelligenceRouter.use(authenticate_1.requireAuth);
exports.intelligenceRouter.get('/next-task', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const tasks = await (0, task_service_1.listTasks)(request.auth.sub);
    return (0, response_1.sendSuccess)(response, (0, intelligence_service_1.getNextBestTask)(tasks));
}));
exports.intelligenceRouter.get('/workload', (0, validate_1.validate)({ query: intelligence_validator_1.dateQuerySchema }), (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const tasks = await (0, task_service_1.listTasks)(request.auth.sub);
    const date = typeof request.query.date === 'string' ? request.query.date : (0, dates_1.todayStr)();
    return (0, response_1.sendSuccess)(response, (0, intelligence_service_1.analyzeWorkload)(tasks, date));
}));
exports.intelligenceRouter.get('/summary', (0, validate_1.validate)({ query: intelligence_validator_1.dateQuerySchema }), (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const tasks = await (0, task_service_1.listTasks)(request.auth.sub);
    const date = typeof request.query.date === 'string' ? request.query.date : (0, dates_1.todayStr)();
    return (0, response_1.sendSuccess)(response, (0, intelligence_service_1.generateDailySummary)(tasks, date));
}));
exports.intelligenceRouter.get('/insights', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const tasks = await (0, task_service_1.listTasks)(request.auth.sub);
    return (0, response_1.sendSuccess)(response, (0, intelligence_service_1.buildInsights)(tasks));
}));
