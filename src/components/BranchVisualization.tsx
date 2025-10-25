/**
 * BranchVisualization Component
 * Tree visualization of conversation branches
 */

import React from 'react';
import { ConversationBranch } from '../types/conversation';

interface BranchVisualizationProps {
  branches: ConversationBranch[];
  currentBranchId: string;
  onSwitchBranch: (branchId: string) => void;
  onCreateBranch?: (messageIndex: number) => void;
}

interface BranchNode {
  branch: ConversationBranch;
  children: BranchNode[];
  level: number;
}

export const BranchVisualization: React.FC<BranchVisualizationProps> = ({
  branches,
  currentBranchId,
  onSwitchBranch,
}) => {
  // Build tree structure
  const buildTree = (): BranchNode[] => {
    const branchMap = new Map<string, BranchNode>();
    
    // Create nodes
    branches.forEach(branch => {
      branchMap.set(branch.id, {
        branch,
        children: [],
        level: 0,
      });
    });

    // Build parent-child relationships
    const roots: BranchNode[] = [];
    branches.forEach(branch => {
      const node = branchMap.get(branch.id)!;
      
      if (branch.parentBranchId) {
        const parent = branchMap.get(branch.parentBranchId);
        if (parent) {
          parent.children.push(node);
          node.level = parent.level + 1;
        } else {
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  const tree = buildTree();

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
  };

  const BranchNode: React.FC<{ node: BranchNode; isLast: boolean }> = ({ node }) => {
    const isCurrent = node.branch.id === currentBranchId;
    const isMain = !node.branch.parentBranchId;

    return (
      <div className="relative">
        {/* Branch Line */}
        {!isMain && (
          <>
            <div className="absolute left-0 top-0 w-px h-4 bg-gray-300 dark:bg-gray-600" />
            <div className="absolute left-0 top-4 w-4 h-px bg-gray-300 dark:bg-gray-600" />
          </>
        )}

        {/* Branch Card */}
        <div
          className={`
            ml-${isMain ? 0 : 6} mb-3 p-3 rounded-lg border-2 cursor-pointer transition-all
            ${isCurrent
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }
          `}
          onClick={() => onSwitchBranch(node.branch.id)}
        >
          {/* Branch Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {isMain ? (
                <span className="text-lg">🌳</span>
              ) : (
                <span className="text-lg">🌿</span>
              )}
              <h4 className="font-semibold text-sm">
                {node.branch.title}
                {isCurrent && <span className="ml-2 text-xs text-blue-500">● Current</span>}
              </h4>
            </div>
            
            {!isMain && (
              <span className="text-xs text-gray-500">
                from msg #{node.branch.branchPointMessageIndex}
              </span>
            )}
          </div>

          {/* Branch Stats */}
          <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
            <span>💬 {node.branch.messageCount} messages</span>
            <span>🕐 {formatDate(node.branch.lastMessageAt)}</span>
          </div>

          {/* Switch Button */}
          {!isCurrent && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSwitchBranch(node.branch.id);
              }}
              className="mt-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
            >
              Switch to this branch
            </button>
          )}
        </div>

        {/* Children */}
        {node.children.length > 0 && (
          <div className="ml-6 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
            {node.children.map((child, index) => (
              <BranchNode
                key={child.branch.id}
                node={child}
                isLast={index === node.children.length - 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          🌳 Conversation Branches
        </h3>
        <span className="text-sm text-gray-500">
          {branches.length} {branches.length === 1 ? 'branch' : 'branches'}
        </span>
      </div>

      {/* Tree */}
      <div className="space-y-2">
        {tree.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No branches yet</p>
            <p className="text-xs mt-1">Create a branch from any message</p>
          </div>
        ) : (
          tree.map((node, index) => (
            <BranchNode
              key={node.branch.id}
              node={node}
              isLast={index === tree.length - 1}
            />
          ))
        )}
      </div>

      {/* Info */}
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs text-gray-600 dark:text-gray-400">
        <p className="font-semibold mb-1">💡 Tip:</p>
        <p>Right-click on any message to create a new branch from that point in the conversation.</p>
      </div>
    </div>
  );
};

/**
 * Mini Branch Indicator
 * Compact branch indicator for the chat interface
 */
interface MiniBranchIndicatorProps {
  branchCount: number;
  currentBranchTitle: string;
  onClick: () => void;
}

export const MiniBranchIndicator: React.FC<MiniBranchIndicatorProps> = ({
  branchCount,
  currentBranchTitle,
  onClick,
}) => {
  if (branchCount <= 1) return null;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-medium hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
      title="View all branches"
    >
      <span>🌿</span>
      <span>{currentBranchTitle}</span>
      <span className="bg-green-200 dark:bg-green-800 px-1.5 py-0.5 rounded-full">
        {branchCount}
      </span>
    </button>
  );
};
