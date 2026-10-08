import { Task } from '@/types/task';
import { getDatabase, initDatabase } from '@/database/database';

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  completed: number;
  dueDateTime: string | null;
  createdAt: string;
  categoryId: string | null;
}

function mapRowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    completed: row.completed === 1,
    dueDateTime: row.dueDateTime ?? null,
    createdAt: row.createdAt,
    categoryId: row.categoryId ?? null,
  };
}

export interface TaskRepository {
  getAll(): Promise<Task[]>;
  getById(id: string): Promise<Task | null>;
  create(task: Omit<Task, 'id' | 'createdAt'>): Promise<Task>;
  update(id: string, task: Partial<Task>): Promise<Task | null>;
  delete(id: string): Promise<boolean>;
}

export const taskRepository: TaskRepository = {
  async getAll(): Promise<Task[]> {
    await initDatabase();
    const db = getDatabase();
    const rows = await db.getAllAsync<TaskRow>('SELECT * FROM tasks ORDER BY createdAt DESC;');
    return rows.map(mapRowToTask);
  },

  async getById(id: string): Promise<Task | null> {
    await initDatabase();
    const db = getDatabase();
    const row = await db.getFirstAsync<TaskRow>('SELECT * FROM tasks WHERE id = ?;', [id]);
    return row ? mapRowToTask(row) : null;
  },

  async create(task: Omit<Task, 'id' | 'createdAt'>): Promise<Task> {
    await initDatabase();
    const db = getDatabase();
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
    const createdAt = new Date().toISOString();
    const completedInt = task.completed ? 1 : 0;

    await db.runAsync(
      `INSERT INTO tasks (id, title, description, completed, dueDateTime, createdAt, categoryId)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        task.title,
        task.description ?? null,
        completedInt,
        task.dueDateTime ?? null,
        createdAt,
        task.categoryId ?? null,
      ]
    );

    return {
      id,
      title: task.title,
      description: task.description ?? null,
      completed: task.completed,
      dueDateTime: task.dueDateTime ?? null,
      createdAt,
      categoryId: task.categoryId ?? null,
    };
  },

  async update(id: string, task: Partial<Task>): Promise<Task | null> {
    await initDatabase();
    const db = getDatabase();
    const existing = await this.getById(id);
    if (!existing) return null;

    const updatedTitle = task.title ?? existing.title;
    const updatedDescription = task.description !== undefined ? task.description : existing.description;
    const updatedCompleted = task.completed !== undefined ? task.completed : existing.completed;
    const updatedDueDateTime = task.dueDateTime !== undefined ? task.dueDateTime : existing.dueDateTime;
    const updatedCategoryId = task.categoryId !== undefined ? task.categoryId : existing.categoryId;

    await db.runAsync(
      `UPDATE tasks
       SET title = ?, description = ?, completed = ?, dueDateTime = ?, categoryId = ?
       WHERE id = ?;`,
      [
        updatedTitle,
        updatedDescription ?? null,
        updatedCompleted ? 1 : 0,
        updatedDueDateTime ?? null,
        updatedCategoryId ?? null,
        id,
      ]
    );

    return {
      id,
      title: updatedTitle,
      description: updatedDescription ?? null,
      completed: updatedCompleted,
      dueDateTime: updatedDueDateTime ?? null,
      createdAt: existing.createdAt,
      categoryId: updatedCategoryId ?? null,
    };
  },

  async delete(id: string): Promise<boolean> {
    await initDatabase();
    const db = getDatabase();
    const result = await db.runAsync('DELETE FROM tasks WHERE id = ?;', [id]);
    return result.changes > 0;
  },
};
