"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tasksRouter = void 0;
const express_1 = require("express");
const asyncHandler_1 = require("../middleware/asyncHandler");
const authenticate_1 = require("../middleware/authenticate");
const validate_1 = require("../middleware/validate");
const response_1 = require("../lib/response");
const task_service_1 = require("../services/task.service");
const tasks_validator_1 = require("../validators/tasks.validator");
exports.tasksRouter = (0, express_1.Router)();
exports.tasksRouter.use(authenticate_1.requireAuth);
exports.tasksRouter.get('/', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const tasks = await (0, task_service_1.listTasks)(request.auth.sub);
    return (0, response_1.sendSuccess)(response, tasks);
}));
exports.tasksRouter.get('/by-date/:date', (0, validate_1.validate)({ params: tasks_validator_1.dateParamSchema }), (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const date = request.params.date;
    const tasks = await (0, task_service_1.listTasksByDate)(request.auth.sub, date);
    return (0, response_1.sendSuccess)(response, tasks);
}));
exports.tasksRouter.get('/:id', (0, validate_1.validate)({ params: tasks_validator_1.idParamSchema }), (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const taskId = request.params.id;
    const task = await (0, task_service_1.getTaskById)(request.auth.sub, taskId);
    return (0, response_1.sendSuccess)(response, task);
}));
exports.tasksRouter.post('/', (0, validate_1.validate)({ body: tasks_validator_1.taskCreateSchema }), (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const task = await (0, task_service_1.createTask)(request.auth.sub, request.body);
    return (0, response_1.sendSuccess)(response, task, 201);
}));
exports.tasksRouter.put('/:id', (0, validate_1.validate)({ params: tasks_validator_1.idParamSchema, body: tasks_validator_1.taskUpdateSchema }), (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const taskId = request.params.id;
    const task = await (0, task_service_1.updateTask)(request.auth.sub, taskId, request.body);
    return (0, response_1.sendSuccess)(response, task);
}));
exports.tasksRouter.patch('/:id/complete', (0, validate_1.validate)({ params: tasks_validator_1.idParamSchema }), (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const taskId = request.params.id;
    const task = await (0, task_service_1.completeTask)(request.auth.sub, taskId);
    return (0, response_1.sendSuccess)(response, task);
}));
exports.tasksRouter.delete('/:id', (0, validate_1.validate)({ params: tasks_validator_1.idParamSchema }), (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const taskId = request.params.id;
    await (0, task_service_1.deleteTask)(request.auth.sub, taskId);
    return (0, response_1.sendSuccess)(response, { deleted: true });
}));
