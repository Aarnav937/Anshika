import React, { useState } from 'react';
import { Task } from '../types';
import { Check, Edit2, Trash2, Calendar, Tag, AlertCircle, Flag } from 'lucide-react';
import { formatDistanceToNow } from '../utils/dateUtils';

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onToggle, onEdit, onDelete }) => {
  const [isHovered, setIsHovered] = useState(false);

  const isOverdue = task.dueDate && task.dueDate < new Date() && task.status === 'pending';
  const isDueSoon = task.dueDate &&
    task.dueDate > new Date() &&
    task.dueDate.getTime() - new Date().getTime() < 24 * 60 * 60 * 1000 && // Within 24 hours
    task.status === 'pending';

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  const getPriorityIcon = (priority: Task['priority']) => {
    switch (priority) {
      case 'high': return <Flag className="w-4 h-4" />;
      case 'medium': return <Flag className="w-4 h-4" />;
      case 'low': return <Flag className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <div
      className={`group p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 hover:shadow-md transition-all duration-200 ${
        task.status === 'completed' ? 'opacity-60' : ''
      } ${isOverdue ? 'border-red-300 dark:border-red-600' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={() => onToggle(task.id)}
          className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            task.status === 'completed'
              ? 'bg-blue-500 border-blue-500 text-white'
              : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
          }`}
        >
          {task.status === 'completed' && <Check className="w-3 h-3" />}
        </button>

        {/* Task Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              {/* Title */}
              <h3 className={`font-medium text-gray-900 dark:text-gray-100 ${
                task.status === 'completed' ? 'line-through' : ''
              }`}>
                {task.title}
              </h3>

              {/* Description */}
              {task.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                  {task.description}
                </p>
              )}

              {/* Metadata Row */}
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                {/* Priority */}
                <div className={`flex items-center gap-1 ${getPriorityColor(task.priority)}`}>
                  {getPriorityIcon(task.priority)}
                  <span className="capitalize">{task.priority}</span>
                </div>

                {/* Due Date */}
                {task.dueDate && (
                  <div className={`flex items-center gap-1 ${
                    isOverdue ? 'text-red-500' :
                    isDueSoon ? 'text-orange-500' :
                    'text-gray-500 dark:text-gray-400'
                  }`}>
                    {isOverdue && <AlertCircle className="w-3 h-3" />}
                    <Calendar className="w-3 h-3" />
                    <span>
                      {isOverdue ? 'Overdue' : formatDistanceToNow(task.dueDate)}
                    </span>
                  </div>
                )}

                {/* Created Date */}
                <span>Created {formatDistanceToNow(task.createdAt)}</span>
              </div>

              {/* Tags */}
              {task.tags && task.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {task.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full"
                    >
                      <Tag className="w-2 h-2" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className={`flex gap-1 transition-opacity ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}>
              <button
                onClick={() => onEdit(task)}
                className="p-1 text-gray-400 hover:text-blue-500 transition-colors rounded"
                title="Edit task"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(task.id)}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded"
                title="Delete task"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskItem;
