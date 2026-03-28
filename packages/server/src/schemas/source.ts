import { z } from 'zod';

export const createSourceSchema = z.object({
  type: z.enum(['url', 'pdf', 'note']),
  url: z.string().url().optional(),
  content: z.string().optional(),
});

export const updateSourceSchema = z.object({
  title: z.string().optional(),
  author: z.string().optional(),
  summary: z.string().optional(),
});

export type CreateSourceInput = z.infer<typeof createSourceSchema>;
export type UpdateSourceInput = z.infer<typeof updateSourceSchema>;
