import { z } from 'zod';

const taskDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const isoDatetimeSchema = z.string().datetime({ offset: true });

const taskBaseSchema = z.object({
  taskName: z.string().trim().min(1).max(160),
  date: taskDateSchema,
  duration: z.coerce.number().positive().max(24),
  priority: z.enum(['low', 'medium', 'high']),
  status: z.enum(['pending', 'in_progress', 'completed']).optional(),
  client: z.string().trim().max(160).optional().default(''),
  technologies: z.array(z.string().trim().min(1).max(60)).max(20).optional().default([]),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).optional().default([]),
  startTime: z.union([isoDatetimeSchema, z.null()]).optional(),
  endTime: z.union([isoDatetimeSchema, z.null()]).optional(),
  manualTimeOverride: z.coerce.boolean().optional().default(false),
});

export const taskCreateSchema = taskBaseSchema;

export const taskUpdateSchema = taskBaseSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export const idParamSchema = z.object({
  id: z.string().trim().min(1),
});

export const dateParamSchema = z.object({
  date: taskDateSchema,
});
