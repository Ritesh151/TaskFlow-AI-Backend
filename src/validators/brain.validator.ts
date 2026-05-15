import { z } from 'zod';

const booleanish = z
  .union([z.boolean(), z.literal('true'), z.literal('false')])
  .transform((value) => value === true || value === 'true');

export const noteIdParamSchema = z.object({
  id: z.string().trim().min(1),
});

const brainBaseSchema = z.object({
  title: z.string().trim().max(140).optional().default(''),
  content: z.string().trim().max(12000).optional().default(''),
  category: z.enum(['idea', 'bug', 'learning', 'snippet', 'thought', 'research']).optional(),
  tags: z.array(z.string().trim().min(1).max(24)).max(10).optional().default([]),
  favorite: z.coerce.boolean().optional().default(false),
  pinned: z.coerce.boolean().optional().default(false),
});

export const brainCreateSchema = brainBaseSchema
  .refine((value) => value.title.length > 0 || value.content.length > 0, {
    message: 'Title or content is required',
  });

export const brainUpdateSchema = brainBaseSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export const brainToggleSchema = z.object({
  value: z.coerce.boolean().optional(),
});

export const brainFilterQuerySchema = z.object({
  sort: z.enum(['newest', 'oldest', 'favorites', 'most-linked']).optional(),
  category: z.enum(['idea', 'bug', 'learning', 'snippet', 'thought', 'research', 'all']).optional(),
  favorite: booleanish.optional(),
  pinned: booleanish.optional(),
  q: z.string().trim().optional(),
  query: z.string().trim().optional(),
});
