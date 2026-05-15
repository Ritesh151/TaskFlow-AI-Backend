"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dateParamSchema = exports.idParamSchema = exports.taskUpdateSchema = exports.taskCreateSchema = void 0;
const zod_1 = require("zod");
const taskDateSchema = zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const isoDatetimeSchema = zod_1.z.string().datetime({ offset: true });
const taskBaseSchema = zod_1.z.object({
    taskName: zod_1.z.string().trim().min(1).max(160),
    date: taskDateSchema,
    duration: zod_1.z.coerce.number().positive().max(24),
    priority: zod_1.z.enum(['low', 'medium', 'high']),
    status: zod_1.z.enum(['pending', 'in_progress', 'completed']).optional(),
    client: zod_1.z.string().trim().max(160).optional().default(''),
    technologies: zod_1.z.array(zod_1.z.string().trim().min(1).max(60)).max(20).optional().default([]),
    tags: zod_1.z.array(zod_1.z.string().trim().min(1).max(30)).max(10).optional().default([]),
    startTime: zod_1.z.union([isoDatetimeSchema, zod_1.z.null()]).optional(),
    endTime: zod_1.z.union([isoDatetimeSchema, zod_1.z.null()]).optional(),
    manualTimeOverride: zod_1.z.coerce.boolean().optional().default(false),
});
exports.taskCreateSchema = taskBaseSchema;
exports.taskUpdateSchema = taskBaseSchema
    .partial()
    .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
});
exports.idParamSchema = zod_1.z.object({
    id: zod_1.z.string().trim().min(1),
});
exports.dateParamSchema = zod_1.z.object({
    date: taskDateSchema,
});
