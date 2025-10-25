import React from 'react';
import { ChevronRight, Home, MessageCircle, FileText, Image, Settings, Users, BookOpen } from 'lucide-react';

export interface BreadcrumbItem {
  id: string;
  label: string;
  href?: string;
  icon?: React.ReactNode;
  current?: boolean;
}

interface BreadcrumbNavigationProps {
  items: BreadcrumbItem[];
  onNavigate?: (item: BreadcrumbItem) => void;
  className?: string;
}

export const BreadcrumbNavigation: React.FC<BreadcrumbNavigationProps> = ({
  items,
  onNavigate,
  className = ''
}) => {
  // @ts-expect-error - Reserved for future icon support
  const getIcon = (iconName?: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      home: <Home className="w-4 h-4" />,
      chat: <MessageCircle className="w-4 h-4" />,
      document: <FileText className="w-4 h-4" />,
      image: <Image className="w-4 h-4" />,
      settings: <Settings className="w-4 h-4" />,
      users: <Users className="w-4 h-4" />,
      book: <BookOpen className="w-4 h-4" />,
    };
    return iconMap[iconName || ''] || <ChevronRight className="w-4 h-4" />;
  };

  if (items.length === 0) return null;

  return (
    <nav
      className={`flex items-center space-x-2 text-sm ${className}`}
      aria-label="Breadcrumb navigation"
    >
      <ol className="flex items-center space-x-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={item.id} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="w-4 h-4 text-gray-400 mx-2" aria-hidden="true" />
              )}

              {isLast ? (
                // Current page - not clickable
                <span
                  className="flex items-center px-3 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg"
                  aria-current="page"
                >
                  {item.icon && (
                    <span className="mr-2" aria-hidden="true">
                      {item.icon}
                    </span>
                  )}
                  <span className="font-medium">{item.label}</span>
                </span>
              ) : (
                // Clickable breadcrumb item
                <button
                  onClick={() => onNavigate?.(item)}
                  className="flex items-center px-3 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 dark:hover:from-gray-700 dark:hover:to-gray-600 transition-all duration-200 group"
                  aria-label={`Navigate to ${item.label}`}
                >
                  {item.icon && (
                    <span className="mr-2 text-gray-400 group-hover:text-indigo-500 transition-colors" aria-hidden="true">
                      {item.icon}
                    </span>
                  )}
                  <span className="font-medium">{item.label}</span>
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

// Hook for managing breadcrumb state
export const useBreadcrumbNavigation = () => {
  const [breadcrumbs, setBreadcrumbs] = React.useState<BreadcrumbItem[]>([
    {
      id: 'home',
      label: 'Home',
      href: '/',
      icon: <Home className="w-4 h-4" />,
      current: true
    }
  ]);

  const updateBreadcrumbs = React.useCallback((newItems: BreadcrumbItem[]) => {
    setBreadcrumbs(newItems.map((item, index) => ({
      ...item,
      current: index === newItems.length - 1
    })));
  }, []);

  const addBreadcrumb = React.useCallback((item: BreadcrumbItem) => {
    setBreadcrumbs(prev => {
      const newItems = [...prev];
      const existingIndex = newItems.findIndex(b => b.id === item.id);

      if (existingIndex >= 0) {
        // Update existing item
        newItems[existingIndex] = item;
        // Mark all items after this as not current
        newItems.forEach((b, index) => {
          b.current = index === existingIndex;
        });
        return newItems.slice(0, existingIndex + 1);
      } else {
        // Add new item
        newItems.forEach(b => {
          b.current = false;
        });
        return [...newItems, { ...item, current: true }];
      }
    });
  }, []);

  const goBack = React.useCallback((steps: number = 1) => {
    setBreadcrumbs(prev => {
      const newItems = [...prev];
      const currentIndex = newItems.findIndex(b => b.current);

      if (currentIndex > 0) {
        const newCurrentIndex = Math.max(0, currentIndex - steps);
        newItems.forEach((b, index) => {
          b.current = index === newCurrentIndex;
        });
        return newItems.slice(0, newCurrentIndex + 1);
      }

      return prev;
    });
  }, []);

  return {
    breadcrumbs,
    updateBreadcrumbs,
    addBreadcrumb,
    goBack
  };
};