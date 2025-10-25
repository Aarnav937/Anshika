import React, { useState, useMemo } from 'react';
import { Task, TaskStatus, TaskPriority } from '../types';
import { useTaskStore } from '../hooks/useTaskStore';
import TaskItem from './TaskItem';
import { Plus, Filter, Search, BarChart3, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

interface TaskListProps {
  onEditTask?: (task: Task) => void;
  onAddTask?: () => void;
}

const TaskList: React.FC<TaskListProps> = ({ onEditTask, onAddTask }) => {
  const {
    tasks,
    stats,
    filter,
    setFilter,
    clearFilter,
    toggleTaskStatus,
    deleteTask
  } = useTaskStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Filter tasks by search query
  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return tasks;

    const query = searchQuery.toLowerCase();
    return tasks.filter(task =>
      task.title.toLowerCase().includes(query) ||
      (task.description && task.description.toLowerCase().includes(query)) ||
      (task.tags && task.tags.some(tag => tag.toLowerCase().includes(query)))
    );
  }, [tasks, searchQuery]);

  const handleStatusFilter = (status: TaskStatus | '') => {
    setFilter({ status: status || undefined });
  };

  const handlePriorityFilter = (priority: TaskPriority | '') => {
    setFilter({ priority: priority || undefined });
  };

  const handleEditTask = (task: Task) => {
    onEditTask?.(task);
  };

  const handleDeleteTask = (id: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      deleteTask(id);
    }
  };

  return (
    <div className="task-list space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Tasks ({stats.total})
        </h2>
        <button
          onClick={onAddTask}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Task
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">Completed</p>
              <p className="text-lg font-bold text-green-700 dark:text-green-300">{stats.completed}</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Pending</p>
              <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{stats.pending}</p>
            </div>
          </div>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <div>
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">Overdue</p>
              <p className="text-lg font-bold text-red-700 dark:text-red-300">{stats.overdue}</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <div>
              <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Completion</p>
              <p className="text-lg font-bold text-purple-700 dark:text-purple-300">{stats.completionRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>

          {(filter.status || filter.priority) && (
            <button
              onClick={clearFilter}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Filter Controls */}
        {showFilters && (
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={filter.status || ''}
                  onChange={(e) => handleStatusFilter(e.target.value as TaskStatus | '')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              {/* Priority Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Priority
                </label>
                <select
                  value={filter.priority || ''}
                  onChange={(e) => handlePriorityFilter(e.target.value as TaskPriority | '')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">All Priorities</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <div className="text-4xl mb-4">📝</div>
            <p className="text-lg font-medium mb-2">
              {searchQuery ? 'No tasks match your search' : 'No tasks yet'}
            </p>
            <p className="text-sm">
              {searchQuery ? 'Try adjusting your search terms or filters' : 'Create your first task to get started'}
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onToggle={toggleTaskStatus}
              onEdit={handleEditTask}
              onDelete={handleDeleteTask}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default TaskList;
