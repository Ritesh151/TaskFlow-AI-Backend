import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth, type AuthenticatedRequest } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { sendSuccess } from '../lib/response';
import { analyzeWorkload, buildInsights, generateDailySummary, getNextBestTask } from '../services/intelligence.service';
import { listTasks } from '../services/task.service';
import { dateQuerySchema } from '../validators/intelligence.validator';
import { todayStr } from '../utils/dates';

export const intelligenceRouter = Router();

intelligenceRouter.use(requireAuth);

intelligenceRouter.get(
  '/next-task',
  asyncHandler(async (request, response) => {
    const tasks = await listTasks((request as AuthenticatedRequest).auth!.sub);
    return sendSuccess(response, getNextBestTask(tasks));
  }),
);

intelligenceRouter.get(
  '/workload',
  validate({ query: dateQuerySchema }),
  asyncHandler(async (request, response) => {
    const tasks = await listTasks((request as AuthenticatedRequest).auth!.sub);
    const date = typeof request.query.date === 'string' ? request.query.date : todayStr();
    return sendSuccess(response, analyzeWorkload(tasks, date));
  }),
);

intelligenceRouter.get(
  '/summary',
  validate({ query: dateQuerySchema }),
  asyncHandler(async (request, response) => {
    const tasks = await listTasks((request as AuthenticatedRequest).auth!.sub);
    const date = typeof request.query.date === 'string' ? request.query.date : todayStr();
    return sendSuccess(response, generateDailySummary(tasks, date));
  }),
);

intelligenceRouter.get(
  '/insights',
  asyncHandler(async (request, response) => {
    const tasks = await listTasks((request as AuthenticatedRequest).auth!.sub);
    return sendSuccess(response, buildInsights(tasks));
  }),
);
