"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.brainRouter = void 0;
const express_1 = require("express");
const asyncHandler_1 = require("../middleware/asyncHandler");
const authenticate_1 = require("../middleware/authenticate");
const validate_1 = require("../middleware/validate");
const response_1 = require("../lib/response");
const brain_service_1 = require("../services/brain.service");
const brain_validator_1 = require("../validators/brain.validator");
exports.brainRouter = (0, express_1.Router)();
exports.brainRouter.use(authenticate_1.requireAuth);
exports.brainRouter.get('/', (0, validate_1.validate)({ query: brain_validator_1.brainFilterQuerySchema }), (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const query = request.query;
    return (0, response_1.sendSuccess)(response, await (0, brain_service_1.getBrainDashboard)(request.auth.sub, {
        sort: query.sort,
        category: query.category,
        favoritesOnly: query.favorite === true,
        pinnedOnly: query.pinned === true,
    }));
}));
exports.brainRouter.get('/graph', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    return (0, response_1.sendSuccess)(response, await (0, brain_service_1.getBrainGraph)(request.auth.sub));
}));
exports.brainRouter.get('/search', (0, validate_1.validate)({ query: brain_validator_1.brainFilterQuerySchema }), (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const query = request.query;
    return (0, response_1.sendSuccess)(response, await (0, brain_service_1.getBrainDashboard)(request.auth.sub, {
        query: String(query.q ?? query.query ?? ''),
        sort: query.sort,
        category: query.category,
        favoritesOnly: query.favorite === true,
        pinnedOnly: query.pinned === true,
    }));
}));
exports.brainRouter.get('/:id', (0, validate_1.validate)({ params: brain_validator_1.noteIdParamSchema }), (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const noteId = request.params.id;
    return (0, response_1.sendSuccess)(response, await (0, brain_service_1.getBrainNote)(request.auth.sub, noteId));
}));
exports.brainRouter.post('/', (0, validate_1.validate)({ body: brain_validator_1.brainCreateSchema }), (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    return (0, response_1.sendSuccess)(response, await (0, brain_service_1.createBrainNote)(request.auth.sub, request.body), 201);
}));
exports.brainRouter.put('/:id', (0, validate_1.validate)({ params: brain_validator_1.noteIdParamSchema, body: brain_validator_1.brainUpdateSchema }), (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const noteId = request.params.id;
    return (0, response_1.sendSuccess)(response, await (0, brain_service_1.updateBrainNote)(request.auth.sub, noteId, request.body));
}));
exports.brainRouter.patch('/:id/favorite', (0, validate_1.validate)({ params: brain_validator_1.noteIdParamSchema, body: brain_validator_1.brainToggleSchema }), (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const noteId = request.params.id;
    return (0, response_1.sendSuccess)(response, await (0, brain_service_1.toggleBrainFavorite)(request.auth.sub, noteId, request.body.value));
}));
exports.brainRouter.patch('/:id/pin', (0, validate_1.validate)({ params: brain_validator_1.noteIdParamSchema, body: brain_validator_1.brainToggleSchema }), (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const noteId = request.params.id;
    return (0, response_1.sendSuccess)(response, await (0, brain_service_1.toggleBrainPin)(request.auth.sub, noteId, request.body.value));
}));
exports.brainRouter.delete('/:id', (0, validate_1.validate)({ params: brain_validator_1.noteIdParamSchema }), (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const noteId = request.params.id;
    await (0, brain_service_1.deleteBrainNote)(request.auth.sub, noteId);
    return (0, response_1.sendSuccess)(response, { brainId: noteId });
}));
