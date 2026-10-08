import { Category } from '@/types/category';
import { getDatabase, initDatabase } from '@/database/database';

export interface CategoryRepository {
  getAll(): Promise<Category[]>;
  getById(id: string): Promise<Category | null>;
  create(category: Omit<Category, 'id'>): Promise<Category>;
  update(id: string, category: Partial<Category>): Promise<Category | null>;
  delete(id: string): Promise<boolean>;
}

export const categoryRepository: CategoryRepository = {
  async getAll(): Promise<Category[]> {
    await initDatabase();
    const db = getDatabase();
    const rows = await db.getAllAsync<Category>('SELECT * FROM categories ORDER BY name ASC;');
    return rows;
  },

  async getById(id: string): Promise<Category | null> {
    await initDatabase();
    const db = getDatabase();
    const row = await db.getFirstAsync<Category>('SELECT * FROM categories WHERE id = ?;', [id]);
    return row ?? null;
  },

  async create(category: Omit<Category, 'id'>): Promise<Category> {
    await initDatabase();
    const db = getDatabase();
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 6);

    await db.runAsync('INSERT INTO categories (id, name) VALUES (?, ?);', [id, category.name]);

    return { id, name: category.name };
  },

  async update(id: string, category: Partial<Category>): Promise<Category | null> {
    await initDatabase();
    const db = getDatabase();
    const existing = await this.getById(id);
    if (!existing) return null;

    const updatedName = category.name ?? existing.name;

    await db.runAsync('UPDATE categories SET name = ? WHERE id = ?;', [updatedName, id]);

    return { id, name: updatedName };
  },

  async delete(id: string): Promise<boolean> {
    await initDatabase();
    const db = getDatabase();
    const result = await db.runAsync('DELETE FROM categories WHERE id = ?;', [id]);
    return result.changes > 0;
  },
};
