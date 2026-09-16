import { beforeEach, describe, expect, it } from 'vitest';
import { taskSchema } from '@app/contract';
import { applyMigrations, createDb, type Db } from '../src/db';
import { migrationsDir } from '../src/paths';
import { createTask, deleteTask, findTask, listTasks, updateTask } from '../src/tasks';

/**
 * Runs against a real SQLite database, migrated by the same generated SQL
 * that production uses. Nothing is mocked, and nothing needs to be running.
 */
let db: Db;

beforeEach(() => {
  db = createDb(':memory:');
  applyMigrations(db, migrationsDir);
});

describe('createTask', () => {
  it('returns a row matching the contract schema', () => {
    const created = createTask(db, { title: 'Write the tests' });

    expect(taskSchema.safeParse(created).success).toBe(true);
  });

  it('defaults a new task to not done', () => {
    expect(createTask(db, { title: 'Write the tests' }).done).toBe(false);
  });
});

describe('listTasks', () => {
  it('returns an empty list for a fresh database', () => {
    expect(listTasks(db)).toEqual([]);
  });

  it('returns every task that was created', () => {
    createTask(db, { title: 'First' });
    createTask(db, { title: 'Second' });

    expect(
      listTasks(db)
        .map((task) => task.title)
        .sort(),
    ).toEqual(['First', 'Second']);
  });
});

describe('updateTask', () => {
  it('marks a task as done', () => {
    const created = createTask(db, { title: 'Write the tests' });

    expect(updateTask(db, created.id, { done: true })?.done).toBe(true);
  });

  it('leaves untouched fields alone', () => {
    const created = createTask(db, { title: 'Write the tests' });

    expect(updateTask(db, created.id, { done: true })?.title).toBe('Write the tests');
  });

  it('returns undefined for an id that does not exist', () => {
    expect(updateTask(db, 999, { done: true })).toBeUndefined();
  });
});

describe('deleteTask', () => {
  it('removes the task', () => {
    const created = createTask(db, { title: 'Write the tests' });
    deleteTask(db, created.id);

    expect(findTask(db, created.id)).toBeUndefined();
  });

  it('reports whether anything was deleted', () => {
    const created = createTask(db, { title: 'Write the tests' });

    expect(deleteTask(db, created.id)).toBe(true);
    expect(deleteTask(db, created.id)).toBe(false);
  });
});
