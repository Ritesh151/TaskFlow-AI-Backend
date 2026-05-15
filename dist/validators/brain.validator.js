"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.brainFilterQuerySchema = exports.brainToggleSchema = exports.brainUpdateSchema = exports.brainCreateSchema = exports.noteIdParamSchema = void 0;
const zod_1 = require("zod");
const booleanish = zod_1.z
    .union([zod_1.z.boolean(), zod_1.z.literal('true'), zod_1.z.literal('false')])
    .transform((value) => value === true || value === 'true');
exports.noteIdParamSchema = zod_1.z.object({
    id: zod_1.z.string().trim().min(1),
});
const brainBaseSchema = zod_1.z.object({
    title: zod_1.z.string().trim().max(140).optional().default(''),
    content: zod_1.z.string().trim().max(12000).optional().default(''),
    category: zod_1.z.enum(['idea', 'bug', 'learning', 'snippet', 'thought', 'research']).optional(),
    tags: zod_1.z.array(zod_1.z.string().trim().min(1).max(24)).max(10).optional().default([]),
    favorite: zod_1.z.coerce.boolean().optional().default(false),
    pinned: zod_1.z.coerce.boolean().optional().default(false),
});
exports.brainCreateSchema = brainBaseSchema
    .refine((value) => value.title.length > 0 || value.content.length > 0, {
    message: 'Title or content is required',
});
exports.brainUpdateSchema = brainBaseSchema
    .partial()
    .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
});
exports.brainToggleSchema = zod_1.z.object({
    value: zod_1.z.coerce.boolean().optional(),
});
exports.brainFilterQuerySchema = zod_1.z.object({
    sort: zod_1.z.enum(['newest', 'oldest', 'favorites', 'most-linked']).optional(),
    category: zod_1.z.enum(['idea', 'bug', 'learning', 'snippet', 'thought', 'research', 'all']).optional(),
    favorite: booleanish.optional(),
    pinned: booleanish.optional(),
    q: zod_1.z.string().trim().optional(),
    query: zod_1.z.string().trim().optional(),
});
