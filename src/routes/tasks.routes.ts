import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth, type AuthenticatedRequest } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { sendSuccess } from '../lib/response';
import {
  completeTask,
  createTask,
  deleteTask,
  getTaskById,
  listTasks,
  listTasksByDate,
  updateTask,
} from '../services/task.service';
import { dateParamSchema, idParamSchema, taskCreateSchema, taskUpdateSchema } from '../validators/tasks.validator';

export const tasksRouter = Router();

tasksRouter.use(requireAuth);

tasksRouter.get(
  '/',
  asyncHandler(async (request, response) => {
    const tasks = await listTasks((request as AuthenticatedRequest).auth!.sub);
    return sendSuccess(response, tasks);
  }),
);

tasksRouter.get(
  '/by-date/:date',
  validate({ params: dateParamSchema }),
  asyncHandler(async (request, response) => {
    const date = request.params.date as string;
    const tasks = await listTasksByDate((request as AuthenticatedRequest).auth!.sub, date);
    return sendSuccess(response, tasks);
  }),
);

tasksRouter.get(
  '/:id',
  validate({ params: idParamSchema }),
  asyncHandler(async (request, response) => {
    const taskId = request.params.id as string;
    const task = await getTaskById((request as AuthenticatedRequest).auth!.sub, taskId);
    return sendSuccess(response, task);
  }),
);

tasksRouter.post(
  '/',
  validate({ body: taskCreateSchema }),
  asyncHandler(async (request, response) => {
    const task = await createTask((request as AuthenticatedRequest).auth!.sub, request.body);
    return sendSuccess(response, task, 201);
  }),
);

tasksRouter.put(
  '/:id',
  validate({ params: idParamSchema, body: taskUpdateSchema }),
  asyncHandler(async (request, response) => {
    const taskId = request.params.id as string;
    const task = await updateTask((request as AuthenticatedRequest).auth!.sub, taskId, request.body);
    return sendSuccess(response, task);
  }),
);

tasksRouter.patch(
  '/:id/complete',
  validate({ params: idParamSchema }),
  asyncHandler(async (request, response) => {
    const taskId = request.params.id as string;
    const task = await completeTask((request as AuthenticatedRequest).auth!.sub, taskId);
    return sendSuccess(response, task);
  }),
);

tasksRouter.delete(
  '/:id',
  validate({ params: idParamSchema }),
  asyncHandler(async (request, response) => {
    const taskId = request.params.id as string;
    await deleteTask((request as AuthenticatedRequest).auth!.sub, taskId);
    return sendSuccess(response, { deleted: true });
  }),
);
