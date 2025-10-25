import { useState, useEffect, useCallback, useMemo } from 'react';
import { Task, TaskState, TaskFilter, TaskStats, TaskStatus } from '../types';
import { taskStorage } from '../services/taskStorageService';

const initialFilter: TaskFilter = {};

export function useTaskStore() {
  const [state, setState] = useState<TaskState>({
    tasks: [],
    filter: initialFilter,
    isLoading: false,
    error: undefined,
  });

  // Load tasks on mount
  useEffect(() => {
    loadTasks();
  }, []);

  // Computed filtered tasks
  const filteredTasks = useMemo(() => {
    let tasks = [...state.tasks];

    const { filter } = state;

    // Filter by status
    if (filter.status) {
      tasks = tasks.filter(task => task.status === filter.status);
    }

    // Filter by priority
    if (filter.priority) {
      tasks = tasks.filter(task => task.priority === filter.priority);
    }

    // Filter by tags
    if (filter.tags && filter.tags.length > 0) {
      tasks = tasks.filter(task =>
        task.tags?.some(tag => filter.tags!.includes(tag))
      );
    }

    // Filter by due date range
    if (filter.dueDateRange) {
      const { start, end } = filter.dueDateRange;
      if (start) {
        tasks = tasks.filter(task => task.dueDate && task.dueDate >= start);
      }
      if (end) {
        tasks = tasks.filter(task => task.dueDate && task.dueDate <= end);
      }
    }

    // Sort by due date (upcoming first), then by priority, then by created date
    tasks.sort((a, b) => {
      // Sort by due date (null dates go to the end)
      if (a.dueDate && b.dueDate) {
        return a.dueDate.getTime() - b.dueDate.getTime();
      }
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;

      // Then by priority (high > medium > low)
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Finally by creation date (newest first)
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    return tasks;
  }, [state.tasks, state.filter]);

  // Computed task statistics
  const taskStats = useMemo((): TaskStats => {
    const total = state.tasks.length;
    const completed = state.tasks.filter(task => task.status === 'completed').length;
    const pending = total - completed;
    const overdue = state.tasks.filter(task =>
      task.status === 'pending' &&
      task.dueDate &&
      task.dueDate < new Date()
    ).length;

    return {
      total,
      completed,
      pending,
      overdue,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [state.tasks]);

  const loadTasks = useCallback(() => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: undefined }));
      const tasks = taskStorage.getAllTasks();
      setState(prev => ({ ...prev, tasks, isLoading: false }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load tasks'
      }));
    }
  }, []);

  const createTask = useCallback((taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: undefined }));
      const newTask = taskStorage.createTask(taskData);
      setState(prev => ({
        ...prev,
        tasks: [...prev.tasks, newTask],
        isLoading: false
      }));
      return newTask;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to create task'
      }));
      return null;
    }
  }, []);

  const updateTask = useCallback((id: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: undefined }));
      const updatedTask = taskStorage.updateTask(id, updates);
      if (updatedTask) {
        setState(prev => ({
          ...prev,
          tasks: prev.tasks.map(task => task.id === id ? updatedTask : task),
          isLoading: false
        }));
        return updatedTask;
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Task not found'
        }));
        return null;
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to update task'
      }));
      return null;
    }
  }, []);

  const deleteTask = useCallback((id: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: undefined }));
      const success = taskStorage.deleteTask(id);
      if (success) {
        setState(prev => ({
          ...prev,
          tasks: prev.tasks.filter(task => task.id !== id),
          isLoading: false
        }));
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Task not found'
        }));
      }
      return success;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to delete task'
      }));
      return false;
    }
  }, []);

  const toggleTaskStatus = useCallback((id: string) => {
    const task = state.tasks.find(t => t.id === id);
    if (task) {
      const newStatus: TaskStatus = task.status === 'completed' ? 'pending' : 'completed';
      updateTask(id, { status: newStatus });
    }
  }, [state.tasks, updateTask]);

  const setFilter = useCallback((filter: Partial<TaskFilter>) => {
    setState(prev => ({
      ...prev,
      filter: { ...prev.filter, ...filter }
    }));
  }, []);

  const clearFilter = useCallback(() => {
    setState(prev => ({ ...prev, filter: initialFilter }));
  }, []);

  const clearAllTasks = useCallback(() => {
    try {
      taskStorage.clearAllTasks();
      setState(prev => ({ ...prev, tasks: [] }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to clear tasks'
      }));
    }
  }, []);

  const exportTasks = useCallback(() => {
    return taskStorage.exportTasks();
  }, []);

  const importTasks = useCallback((jsonData: string) => {
    try {
      taskStorage.importTasks(jsonData);
      loadTasks(); // Reload tasks after import
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to import tasks'
      }));
    }
  }, [loadTasks]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: undefined }));
  }, []);

  return {
    // State
    tasks: filteredTasks,
    allTasks: state.tasks,
    filter: state.filter,
    isLoading: state.isLoading,
    error: state.error,

    // Stats
    stats: taskStats,

    // Actions
    createTask,
    updateTask,
    deleteTask,
    toggleTaskStatus,
    setFilter,
    clearFilter,
    clearAllTasks,
    exportTasks,
    importTasks,
    loadTasks,
    clearError,
  };
}
