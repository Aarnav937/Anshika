import { Task, TaskPriority, TaskStatus } from '../types';
import { taskStorage } from './taskStorageService';

/**
 * Task Management Service for AI Tool Integration
 * Provides functions that can be called by AI tools
 */

// Parse natural language priority
export function parsePriority(text: string): TaskPriority {
  const lowerText = text.toLowerCase();
  if (lowerText.includes('high') || lowerText.includes('urgent') || lowerText.includes('important')) {
    return 'high';
  }
  if (lowerText.includes('low') || lowerText.includes('minor')) {
    return 'low';
  }
  return 'medium'; // default
}

// Parse natural language due date
export function parseDueDate(text: string): Date | undefined {
  const lowerText = text.toLowerCase();

  // Today
  if (lowerText.includes('today')) {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    return today;
  }

  // Tomorrow
  if (lowerText.includes('tomorrow')) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);
    return tomorrow;
  }

  // This week
  if (lowerText.includes('this week') || lowerText.includes('end of week')) {
    const endOfWeek = new Date();
    const daysUntilEndOfWeek = 6 - endOfWeek.getDay(); // Saturday
    endOfWeek.setDate(endOfWeek.getDate() + daysUntilEndOfWeek);
    endOfWeek.setHours(23, 59, 59, 999);
    return endOfWeek;
  }

  // Next week
  if (lowerText.includes('next week')) {
    const nextWeek = new Date();
    const daysUntilNextWeek = 7 - nextWeek.getDay() + 7; // Next Sunday
    nextWeek.setDate(nextWeek.getDate() + daysUntilNextWeek);
    nextWeek.setHours(23, 59, 59, 999);
    return nextWeek;
  }

  // In X days
  const daysMatch = lowerText.match(/in (\d+) days?/);
  if (daysMatch) {
    const days = parseInt(daysMatch[1]);
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    futureDate.setHours(23, 59, 59, 999);
    return futureDate;
  }

  // Specific date patterns (basic implementation)
  const dateMatch = lowerText.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
  if (dateMatch) {
    const [, month, day, year] = dateMatch;
    const currentYear = new Date().getFullYear();
    const targetYear = year ? (year.length === 2 ? 2000 + parseInt(year) : parseInt(year)) : currentYear;

    const date = new Date(targetYear, parseInt(month) - 1, parseInt(day));
    date.setHours(23, 59, 59, 999);

    // If the date is in the past, assume next year
    if (date < new Date()) {
      date.setFullYear(targetYear + 1);
    }

    return date;
  }

  return undefined;
}

// Parse tags from text
export function parseTags(text: string): string[] {
  const tagMatches = text.match(/#(\w+)/g);
  return tagMatches ? tagMatches.map(tag => tag.substring(1)) : [];
}

// AI Tool Functions

export function createTask(title: string, description?: string, priority?: string, dueDate?: string, tags?: string[]): string {
  try {
    const taskData = {
      title: title.trim(),
      description: description?.trim(),
      status: 'pending' as TaskStatus,
      priority: priority ? parsePriority(priority) : 'medium' as TaskPriority,
      dueDate: dueDate ? parseDueDate(dueDate) : undefined,
      tags: tags || parseTags(title + (description || ''))
    };

    const task = taskStorage.createTask(taskData);

    return `✅ Task created successfully!\n\n**${task.title}**\n• Priority: ${task.priority}\n• Status: ${task.status}\n${task.dueDate ? `• Due: ${task.dueDate.toLocaleDateString()}\n` : ''}${task.tags && task.tags.length > 0 ? `• Tags: ${task.tags.join(', ')}\n` : ''}${task.description ? `\n${task.description}` : ''}`;
  } catch (error) {
    return `❌ Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

export function listTasks(status?: string, limit?: number): string {
  try {
    let tasks = taskStorage.getAllTasks();

    // Filter by status if provided
    if (status && (status === 'pending' || status === 'completed')) {
      tasks = tasks.filter(task => task.status === status);
    }

    // Sort by creation date (newest first)
    tasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply limit
    const displayLimit = limit || 10;
    const displayTasks = tasks.slice(0, displayLimit);

    if (displayTasks.length === 0) {
      return `📝 No ${status || ''} tasks found.`;
    }

    let result = `📝 ${status ? status.charAt(0).toUpperCase() + status.slice(1) : 'All'} Tasks (${displayTasks.length}${tasks.length > displayLimit ? ` of ${tasks.length}` : ''}):\n\n`;

    displayTasks.forEach((task, index) => {
      const statusIcon = task.status === 'completed' ? '✅' : '⏳';
      const priorityIcon = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';
      const dueInfo = task.dueDate ?
        (task.dueDate < new Date() && task.status === 'pending' ? ' (⚠️ Overdue)' : ` (Due: ${task.dueDate.toLocaleDateString()})`) :
        '';

      result += `${index + 1}. ${statusIcon} ${priorityIcon} **${task.title}**${dueInfo}\n`;

      if (task.description) {
        result += `   ${task.description}\n`;
      }

      if (task.tags && task.tags.length > 0) {
        result += `   Tags: ${task.tags.join(', ')}\n`;
      }

      result += `   Created: ${task.createdAt.toLocaleDateString()}\n\n`;
    });

    // Add summary stats
    const totalTasks = taskStorage.getAllTasks().length;
    const completedTasks = taskStorage.getAllTasks().filter(t => t.status === 'completed').length;
    const pendingTasks = totalTasks - completedTasks;
    const overdueTasks = taskStorage.getOverdueTasks().length;

    result += `📊 Summary: ${totalTasks} total, ${completedTasks} completed, ${pendingTasks} pending${overdueTasks > 0 ? `, ${overdueTasks} overdue` : ''}`;

    return result;
  } catch (error) {
    return `❌ Failed to list tasks: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

export function updateTask(taskId: string, updates: { title?: string; description?: string; status?: string; priority?: string; dueDate?: string; tags?: string[] }): string {
  try {
    const updateData: Partial<Omit<Task, 'id' | 'createdAt'>> = {};

    if (updates.title) updateData.title = updates.title.trim();
    if (updates.description !== undefined) updateData.description = updates.description?.trim();
    if (updates.status && (updates.status === 'pending' || updates.status === 'completed')) {
      updateData.status = updates.status as TaskStatus;
    }
    if (updates.priority) updateData.priority = parsePriority(updates.priority);
    if (updates.dueDate) updateData.dueDate = parseDueDate(updates.dueDate);
    if (updates.tags) updateData.tags = updates.tags;

    const updatedTask = taskStorage.updateTask(taskId, updateData);

    if (!updatedTask) {
      return `❌ Task not found with ID: ${taskId}`;
    }

    return `✅ Task updated successfully!\n\n**${updatedTask.title}**\n• Status: ${updatedTask.status}\n• Priority: ${updatedTask.priority}\n${updatedTask.dueDate ? `• Due: ${updatedTask.dueDate.toLocaleDateString()}\n` : ''}${updatedTask.tags && updatedTask.tags.length > 0 ? `• Tags: ${updatedTask.tags.join(', ')}\n` : ''}`;
  } catch (error) {
    return `❌ Failed to update task: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

export function deleteTask(taskId: string): string {
  try {
    const task = taskStorage.getTaskById(taskId);
    if (!task) {
      return `❌ Task not found with ID: ${taskId}`;
    }

    const success = taskStorage.deleteTask(taskId);
    if (success) {
      return `🗑️ Task "${task.title}" has been deleted successfully.`;
    } else {
      return `❌ Failed to delete task: ${taskId}`;
    }
  } catch (error) {
    return `❌ Failed to delete task: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

export function toggleTaskStatus(taskId: string): string {
  try {
    const task = taskStorage.getTaskById(taskId);
    if (!task) {
      return `❌ Task not found with ID: ${taskId}`;
    }

    const newStatus: TaskStatus = task.status === 'completed' ? 'pending' : 'completed';
    const updatedTask = taskStorage.updateTask(taskId, { status: newStatus });

    if (updatedTask) {
      const action = newStatus === 'completed' ? 'marked as completed' : 'marked as pending';
      return `✅ Task "${updatedTask.title}" has been ${action}.`;
    } else {
      return `❌ Failed to update task status.`;
    }
  } catch (error) {
    return `❌ Failed to toggle task status: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

export function getTaskStats(): string {
  try {
    const allTasks = taskStorage.getAllTasks();
    const completed = allTasks.filter(t => t.status === 'completed').length;
    const pending = allTasks.length - completed;
    const overdue = taskStorage.getOverdueTasks().length;
    const completionRate = allTasks.length > 0 ? Math.round((completed / allTasks.length) * 100) : 0;

    return `📊 Task Statistics:\n\n• Total Tasks: ${allTasks.length}\n• Completed: ${completed}\n• Pending: ${pending}\n• Overdue: ${overdue}\n• Completion Rate: ${completionRate}%\n\n${overdue > 0 ? `⚠️ You have ${overdue} overdue task${overdue > 1 ? 's' : ''}!` : ''}`;
  } catch (error) {
    return `❌ Failed to get task statistics: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}
