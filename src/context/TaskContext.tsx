import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Task } from '@/types/task';
import { Category } from '@/types/category';

interface TaskContextData {
  tasks: Task[];
  categories: Category[];
  loading: boolean;
}

const TaskContext = createContext<TaskContextData>({
  tasks: [],
  categories: [],
  loading: false,
});

export const TaskProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tasks] = useState<Task[]>([]);
  const [categories] = useState<Category[]>([]);
  const [loading] = useState<boolean>(false);

  return (
    <TaskContext.Provider value={{ tasks, categories, loading }}>
      {children}
    </TaskContext.Provider>
  );
};

export function useTasks() {
  return useContext(TaskContext);
}
