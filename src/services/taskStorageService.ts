import { Task } from '../types';

const TASK_STORAGE_KEY = 'anshika_tasks';

/**
 * Task Storage Service using localStorage
 * Handles all CRUD operations for tasks with persistence
 */
export class TaskStorageService {
  private static instance: TaskStorageService;

  private constructor() {}

  static getInstance(): TaskStorageService {
    if (!TaskStorageService.instance) {
      TaskStorageService.instance = new TaskStorageService();
    }
    return TaskStorageService.instance;
  }

  /**
   * Get all tasks from localStorage
   */
  getAllTasks(): Task[] {
    try {
      const stored = localStorage.getItem(TASK_STORAGE_KEY);
      if (!stored) return [];

      const tasks = JSON.parse(stored) as Task[];
      // Convert date strings back to Date objects
      return tasks.map(task => ({
        ...task,
        createdAt: new Date(task.createdAt),
        updatedAt: new Date(task.updatedAt),
        dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
        completedAt: task.completedAt ? new Date(task.completedAt) : undefined,
      }));
    } catch (error) {
      console.error('Error loading tasks from localStorage:', error);
      return [];
    }
  }

  /**
   * Save all tasks to localStorage
   */
  private saveTasks(tasks: Task[]): void {
    try {
      localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
      console.error('Error saving tasks to localStorage:', error);
      throw new Error('Failed to save tasks');
    }
  }

  /**
   * Get a single task by ID
   */
  getTaskById(id: string): Task | undefined {
    const tasks = this.getAllTasks();
    return tasks.find(task => task.id === id);
  }

  /**
   * Create a new task
   */
  createTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Task {
    const tasks = this.getAllTasks();
    const newTask: Task = {
      ...taskData,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    tasks.push(newTask);
    this.saveTasks(tasks);
    return newTask;
  }

  /**
   * Update an existing task
   */
  updateTask(id: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>): Task | null {
    const tasks = this.getAllTasks();
    const taskIndex = tasks.findIndex(task => task.id === id);

    if (taskIndex === -1) return null;

    const updatedTask: Task = {
      ...tasks[taskIndex],
      ...updates,
      id, // Ensure ID doesn't change
      createdAt: tasks[taskIndex].createdAt, // Ensure createdAt doesn't change
      updatedAt: new Date(),
      // Handle completedAt logic
      completedAt: updates.status === 'completed' && tasks[taskIndex].status !== 'completed'
        ? new Date()
        : updates.status === 'pending'
        ? undefined
        : tasks[taskIndex].completedAt,
    };

    tasks[taskIndex] = updatedTask;
    this.saveTasks(tasks);
    return updatedTask;
  }

  /**
   * Delete a task
   */
  deleteTask(id: string): boolean {
    const tasks = this.getAllTasks();
    const filteredTasks = tasks.filter(task => task.id !== id);

    if (filteredTasks.length === tasks.length) return false; // Task not found

    this.saveTasks(filteredTasks);
    return true;
  }

  /**
   * Clear all tasks
   */
  clearAllTasks(): void {
    localStorage.removeItem(TASK_STORAGE_KEY);
  }

  /**
   * Get tasks by status
   */
  getTasksByStatus(status: Task['status']): Task[] {
    const tasks = this.getAllTasks();
    return tasks.filter(task => task.status === status);
  }

  /**
   * Get overdue tasks
   */
  getOverdueTasks(): Task[] {
    const tasks = this.getAllTasks();
    const now = new Date();
    return tasks.filter(task =>
      task.status === 'pending' &&
      task.dueDate &&
      task.dueDate < now
    );
  }

  /**
   * Search tasks by title or description
   */
  searchTasks(query: string): Task[] {
    const tasks = this.getAllTasks();
    const lowerQuery = query.toLowerCase();
    return tasks.filter(task =>
      task.title.toLowerCase().includes(lowerQuery) ||
      (task.description && task.description.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Generate a unique ID for tasks
   */
  private generateId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Export tasks as JSON
   */
  exportTasks(): string {
    const tasks = this.getAllTasks();
    return JSON.stringify(tasks, null, 2);
  }

  /**
   * Import tasks from JSON
   */
  importTasks(jsonData: string): void {
    try {
      const tasks = JSON.parse(jsonData) as Task[];
      // Validate the data structure
      const validTasks = tasks.filter(task =>
        task.id &&
        task.title &&
        task.status &&
        task.priority &&
        task.createdAt &&
        task.updatedAt
      );

      if (validTasks.length > 0) {
        this.saveTasks(validTasks);
      }
    } catch (error) {
      console.error('Error importing tasks:', error);
      throw new Error('Invalid task data format');
    }
  }
}

// Export singleton instance
export const taskStorage = TaskStorageService.getInstance();
