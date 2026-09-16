import { desc, eq } from 'drizzle-orm';
import { tasks, type Task, type TaskDraft, type TaskPatch } from '@app/contract';
import type { Db } from './db';

/**
 * Every function here returns rows shaped by the contract's `Task` type,
 * because both that type and this table come from the same declaration.
 */

export function listTasks(db: Db): Task[] {
  return db.select().from(tasks).orderBy(desc(tasks.createdAt), desc(tasks.id)).all();
}

export function findTask(db: Db, id: number): Task | undefined {
  return db.select().from(tasks).where(eq(tasks.id, id)).get();
}

export function createTask(db: Db, draft: TaskDraft): Task {
  const created = db.insert(tasks).values(draft).returning().get();
  return created;
}

export function updateTask(db: Db, id: number, patch: TaskPatch): Task | undefined {
  if (Object.keys(patch).length === 0) {
    return findTask(db, id);
  }
  return db.update(tasks).set(patch).where(eq(tasks.id, id)).returning().get();
}

export function deleteTask(db: Db, id: number): boolean {
  const deleted = db.delete(tasks).where(eq(tasks.id, id)).returning().all();
  return deleted.length > 0;
}
