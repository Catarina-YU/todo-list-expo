export interface Task {
  id: string;
  title: string;
  description?: string | null;
  completed: boolean;
  dueDateTime?: string | null;
  createdAt: string;
  categoryId?: string | null;
}
