import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth, type AuthenticatedRequest } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { AppError } from '../lib/errors';
import { sendSuccess } from '../lib/response';
import {
  checkInUser,
  checkOutUser,
  endBreakForUser,
  endDeepWorkForUser,
  getAttendanceCalendar,
  getAttendanceHistory,
  getAttendanceInsights,
  getAttendanceStats,
  getTodayAttendance,
  startBreakForUser,
  startDeepWorkForUser,
} from '../services/attendance.service';
import { breakActionSchema, calendarQuerySchema } from '../validators/attendance.validator';

function normalizeAttendanceError(error: unknown) {
  if (error instanceof Error) {
    return new AppError(error.message, 400, 'ATTENDANCE_ACTION_FAILED');
  }
  return error;
}

export const attendanceRouter = Router();

attendanceRouter.use(requireAuth);

attendanceRouter.get(
  '/today',
  asyncHandler(async (request, response) => {
    return sendSuccess(response, await getTodayAttendance((request as AuthenticatedRequest).auth!.sub));
  }),
);

attendanceRouter.get(
  '/history',
  asyncHandler(async (request, response) => {
    return sendSuccess(response, await getAttendanceHistory((request as AuthenticatedRequest).auth!.sub));
  }),
);

attendanceRouter.post(
  '/check-in',
  asyncHandler(async (request, response, next) => {
    try {
      return sendSuccess(response, await checkInUser((request as AuthenticatedRequest).auth!.sub));
    } catch (error) {
      next(normalizeAttendanceError(error));
    }
  }),
);

attendanceRouter.post(
  '/check-out',
  asyncHandler(async (request, response, next) => {
    try {
      return sendSuccess(response, await checkOutUser((request as AuthenticatedRequest).auth!.sub));
    } catch (error) {
      next(normalizeAttendanceError(error));
    }
  }),
);

attendanceRouter.post(
  '/break/start',
  validate({ body: breakActionSchema }),
  asyncHandler(async (request, response, next) => {
    try {
      return sendSuccess(
        response,
        await startBreakForUser((request as AuthenticatedRequest).auth!.sub, request.body.type),
      );
    } catch (error) {
      next(normalizeAttendanceError(error));
    }
  }),
);

attendanceRouter.post(
  '/break/end',
  asyncHandler(async (request, response, next) => {
    try {
      return sendSuccess(response, await endBreakForUser((request as AuthenticatedRequest).auth!.sub));
    } catch (error) {
      next(normalizeAttendanceError(error));
    }
  }),
);

attendanceRouter.post(
  '/deep-work/start',
  asyncHandler(async (request, response, next) => {
    try {
      return sendSuccess(response, await startDeepWorkForUser((request as AuthenticatedRequest).auth!.sub));
    } catch (error) {
      next(normalizeAttendanceError(error));
    }
  }),
);

attendanceRouter.post(
  '/deep-work/end',
  asyncHandler(async (request, response, next) => {
    try {
      return sendSuccess(response, await endDeepWorkForUser((request as AuthenticatedRequest).auth!.sub));
    } catch (error) {
      next(normalizeAttendanceError(error));
    }
  }),
);

attendanceRouter.get(
  '/stats',
  asyncHandler(async (request, response) => {
    return sendSuccess(response, await getAttendanceStats((request as AuthenticatedRequest).auth!.sub));
  }),
);

attendanceRouter.get(
  '/calendar',
  validate({ query: calendarQuerySchema }),
  asyncHandler(async (request, response) => {
    return sendSuccess(
      response,
      await getAttendanceCalendar(
        (request as AuthenticatedRequest).auth!.sub,
        typeof request.query.months === 'number' ? request.query.months : undefined,
      ),
    );
  }),
);

attendanceRouter.get(
  '/insights',
  asyncHandler(async (request, response) => {
    return sendSuccess(response, await getAttendanceInsights((request as AuthenticatedRequest).auth!.sub));
  }),
);
