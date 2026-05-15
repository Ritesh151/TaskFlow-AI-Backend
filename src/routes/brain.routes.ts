import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth, type AuthenticatedRequest } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { sendSuccess } from '../lib/response';
import {
  createBrainNote,
  deleteBrainNote,
  getBrainDashboard,
  getBrainGraph,
  getBrainNote,
  toggleBrainFavorite,
  toggleBrainPin,
  updateBrainNote,
} from '../services/brain.service';
import {
  brainCreateSchema,
  brainFilterQuerySchema,
  brainToggleSchema,
  brainUpdateSchema,
  noteIdParamSchema,
} from '../validators/brain.validator';

export const brainRouter = Router();

brainRouter.use(requireAuth);

brainRouter.get(
  '/',
  validate({ query: brainFilterQuerySchema }),
  asyncHandler(async (request, response) => {
    const query = request.query as {
      sort?: 'newest' | 'oldest' | 'favorites' | 'most-linked';
      category?: 'idea' | 'bug' | 'learning' | 'snippet' | 'thought' | 'research' | 'all';
      favorite?: boolean;
      pinned?: boolean;
    };

    return sendSuccess(
      response,
      await getBrainDashboard((request as AuthenticatedRequest).auth!.sub, {
        sort: query.sort,
        category: query.category,
        favoritesOnly: query.favorite === true,
        pinnedOnly: query.pinned === true,
      }),
    );
  }),
);

brainRouter.get(
  '/graph',
  asyncHandler(async (request, response) => {
    return sendSuccess(response, await getBrainGraph((request as AuthenticatedRequest).auth!.sub));
  }),
);

brainRouter.get(
  '/search',
  validate({ query: brainFilterQuerySchema }),
  asyncHandler(async (request, response) => {
    const query = request.query as {
      sort?: 'newest' | 'oldest' | 'favorites' | 'most-linked';
      category?: 'idea' | 'bug' | 'learning' | 'snippet' | 'thought' | 'research' | 'all';
      favorite?: boolean;
      pinned?: boolean;
      q?: string;
      query?: string;
    };

    return sendSuccess(
      response,
      await getBrainDashboard((request as AuthenticatedRequest).auth!.sub, {
        query: String(query.q ?? query.query ?? ''),
        sort: query.sort,
        category: query.category,
        favoritesOnly: query.favorite === true,
        pinnedOnly: query.pinned === true,
      }),
    );
  }),
);

brainRouter.get(
  '/:id',
  validate({ params: noteIdParamSchema }),
  asyncHandler(async (request, response) => {
    const noteId = request.params.id as string;
    return sendSuccess(response, await getBrainNote((request as AuthenticatedRequest).auth!.sub, noteId));
  }),
);

brainRouter.post(
  '/',
  validate({ body: brainCreateSchema }),
  asyncHandler(async (request, response) => {
    return sendSuccess(response, await createBrainNote((request as AuthenticatedRequest).auth!.sub, request.body), 201);
  }),
);

brainRouter.put(
  '/:id',
  validate({ params: noteIdParamSchema, body: brainUpdateSchema }),
  asyncHandler(async (request, response) => {
    const noteId = request.params.id as string;
    return sendSuccess(
      response,
      await updateBrainNote((request as AuthenticatedRequest).auth!.sub, noteId, request.body),
    );
  }),
);

brainRouter.patch(
  '/:id/favorite',
  validate({ params: noteIdParamSchema, body: brainToggleSchema }),
  asyncHandler(async (request, response) => {
    const noteId = request.params.id as string;
    return sendSuccess(
      response,
      await toggleBrainFavorite((request as AuthenticatedRequest).auth!.sub, noteId, request.body.value),
    );
  }),
);

brainRouter.patch(
  '/:id/pin',
  validate({ params: noteIdParamSchema, body: brainToggleSchema }),
  asyncHandler(async (request, response) => {
    const noteId = request.params.id as string;
    return sendSuccess(
      response,
      await toggleBrainPin((request as AuthenticatedRequest).auth!.sub, noteId, request.body.value),
    );
  }),
);

brainRouter.delete(
  '/:id',
  validate({ params: noteIdParamSchema }),
  asyncHandler(async (request, response) => {
    const noteId = request.params.id as string;
    await deleteBrainNote((request as AuthenticatedRequest).auth!.sub, noteId);
    return sendSuccess(response, { brainId: noteId });
  }),
);
