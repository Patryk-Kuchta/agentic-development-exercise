import { createInsertSchema, createSelectSchema } from 'drizzle-orm/zod';
import type { z } from 'zod';
import { tasks } from './schema';

/** A task exactly as it is stored and returned. Derived from the table. */
export const taskSchema = createSelectSchema(tasks);

/** What a client may send to create a task. `id`, `done` and `createdAt` are server-owned. */
export const taskDraftSchema = createInsertSchema(tasks, {
  title: (schema) => schema.trim().min(1, 'Title is required').max(200),
}).omit({ id: true, done: true, createdAt: true });

/** A partial update. Only the fields a client is allowed to change. */
export const taskPatchSchema = taskSchema.pick({ title: true, done: true }).partial();

export type Task = z.infer<typeof taskSchema>;
export type TaskDraft = z.infer<typeof taskDraftSchema>;
export type TaskPatch = z.infer<typeof taskPatchSchema>;
