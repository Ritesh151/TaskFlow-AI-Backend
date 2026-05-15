import { z } from 'zod';

export const breakActionSchema = z.object({
  type: z.enum(['lunch', 'tea', 'idle', 'custom']).optional().default('custom'),
});

export const calendarQuerySchema = z.object({
  months: z.coerce.number().int().min(1).max(6).optional(),
});
