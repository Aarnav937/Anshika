import React, { useState, useCallback } from 'react';
import {
  MessageSquare,
  FileText,
  Image as ImageIcon,
  Upload,
  Search,
  HelpCircle,
  GitCompare,
  TrendingUp,
  Sparkles,
  Shuffle,
  Layers,
  Image,
  Clock,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

export type MainTabType = 'chat' | 'document-intelligence' | 'image-generation';
export type SubTabType =
  | 'upload-processing'
  | 'search-filters'
  | 'qa'
  | 'comparison'
  | 'insights'
  | 'generate'
  | 'transform'
  | 'batch'
  | 'gallery'
  | 'history';

export interface TabState {
  mainTab: MainTabType;
  subTab: SubTabType | null;
}

interface LeftSidebarProps {
  activeTab: TabState;
  onTabChange: (tab: TabState) => void;
  className?: string;
}

interface TabConfig {
  id: MainTabType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  subTabs: SubTabConfig[];
}

interface SubTabConfig {
  id: SubTabType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const tabConfigs: TabConfig[] = [
  {
    id: 'chat',
    label: 'Chat',
    icon: MessageSquare,
    subTabs: [],
  },
  {
    id: 'document-intelligence',
    label: 'Document Intelligence',
    icon: FileText,
    subTabs: [
      { id: 'upload-processing', label: 'Upload & Processing', icon: Upload },
      { id: 'search-filters', label: 'Search & Filters', icon: Search },
      { id: 'qa', label: 'Q&A', icon: HelpCircle },
      { id: 'comparison', label: 'Comparison', icon: GitCompare },
      { id: 'insights', label: 'Insights', icon: TrendingUp },
    ],
  },
  {
    id: 'image-generation',
    label: 'Image Generation',
    icon: ImageIcon,
    subTabs: [
      { id: 'generate', label: 'Generate', icon: Sparkles },
      { id: 'transform', label: 'Transform', icon: Shuffle },
      { id: 'batch', label: 'Batch', icon: Layers },
      { id: 'gallery', label: 'Gallery', icon: Image },
      { id: 'history', label: 'History', icon: Clock },
    ],
  },
];

const LeftSidebar: React.FC<LeftSidebarProps> = ({
  activeTab,
  onTabChange,
  className = '',
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<MainTabType>>(
    new Set(['document-intelligence', 'image-generation'])
  );

  const toggleSection = useCallback((tabId: MainTabType) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tabId)) {
        newSet.delete(tabId);
      } else {
        newSet.add(tabId);
      }
      return newSet;
    });
  }, []);

  const handleMainTabClick = useCallback((tabId: MainTabType) => {
    const config = tabConfigs.find(t => t.id === tabId);
    if (!config) return;

    // If clicking on a main tab that has sub-tabs
    if (config.subTabs.length > 0) {
      // Toggle expansion
      toggleSection(tabId);
      
      // Also activate the first sub-tab if not already on this main tab
      if (activeTab.mainTab !== tabId) {
        onTabChange({
          mainTab: tabId,
          subTab: config.subTabs[0].id,
        });
      }
      return;
    }

    // For tabs without sub-tabs (like Chat), just set as active
    onTabChange({
      mainTab: tabId,
      subTab: null,
    });
  }, [onTabChange, toggleSection, activeTab.mainTab]);

  const handleSubTabClick = useCallback((mainTabId: MainTabType, subTabId: SubTabType) => {
    onTabChange({
      mainTab: mainTabId,
      subTab: subTabId,
    });
  }, [onTabChange]);

  const isMainTabActive = (tabId: MainTabType) => {
    return activeTab.mainTab === tabId && !activeTab.subTab;
  };

  const isSubTabActive = (subTabId: SubTabType) => {
    return activeTab.subTab === subTabId;
  };

  const isSectionExpanded = (tabId: MainTabType) => {
    return expandedSections.has(tabId);
  };

  return (
    <div className={`fixed left-0 top-0 h-full w-72 lg:w-72 md:w-64 sm:w-56 xs:w-52 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-700/50 shadow-2xl transition-all duration-300 z-50 animate-backdrop-fade-in ${className}`}>
      <div className="flex flex-col h-full p-4 lg:p-6">
        {/* Header */}
         <div className="mb-6 lg:mb-8">
           <h2 className="text-lg lg:text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
             Navigation
           </h2>
           <p className="text-xs lg:text-sm text-gray-500 dark:text-gray-400 mt-1">
             Access all features
           </p>
         </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-2">
          {tabConfigs.map((config) => {
            const IconComponent = config.icon;
            const isExpanded = isSectionExpanded(config.id);
            const hasSubTabs = config.subTabs.length > 0;

            return (
              <div key={config.id} className="space-y-1">
                {/* Main Tab */}
                <button
                  onClick={() => handleMainTabClick(config.id)}
                  className={`w-full flex items-center justify-between px-3 lg:px-4 py-2.5 lg:py-3 rounded-xl text-left transition-all duration-200 group touch-manipulation btn-press hover-lift ${
                    isMainTabActive(config.id)
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg animate-gradient'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center gap-2 lg:gap-3">
                    <IconComponent className={`w-4 h-4 lg:w-5 lg:h-5 transition-colors ${
                      isMainTabActive(config.id)
                        ? 'text-white'
                        : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
                    }`} />
                    <span className="font-medium text-sm lg:text-base">{config.label}</span>
                  </div>

                  {hasSubTabs && (
                    <div className="transition-transform duration-200">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </div>
                  )}
                </button>

                {/* Sub Tabs */}
                 {hasSubTabs && (
                   <div className={`ml-3 lg:ml-4 space-y-1 overflow-hidden transition-all duration-300 ${
                     isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                   }`}>
                     {config.subTabs.map((subTab) => {
                       const SubIconComponent = subTab.icon;
                       const isActive = isSubTabActive(subTab.id);

                       return (
                         <button
                           key={subTab.id}
                           onClick={() => handleSubTabClick(config.id, subTab.id)}
                           className={`w-full flex items-center gap-2 lg:gap-3 px-3 lg:px-4 py-2 lg:py-2.5 rounded-lg text-left transition-all duration-200 group touch-manipulation btn-press hover-lift ${
                             isActive
                               ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-l-2 border-blue-500'
                               : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/30 hover:text-gray-800 dark:hover:text-gray-200'
                           }`}
                         >
                           <SubIconComponent className={`w-3 h-3 lg:w-4 lg:h-4 transition-colors ${
                             isActive
                               ? 'text-blue-500'
                               : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-400'
                           }`} />
                           <span className="text-xs lg:text-sm font-medium">{subTab.label}</span>
                         </button>
                       );
                     })}
                   </div>
                 )}
              </div>
            );
          })}
        </nav>

        {/* Footer Info */}
         <div className="mt-6 lg:mt-8 pt-4 lg:pt-6 border-t border-gray-200/50 dark:border-gray-700/50">
           <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
             <p>A.N.S.H.I.K.A.</p>
             <p className="mt-1">Built with a dream ✨</p>
           </div>
         </div>
      </div>
    </div>
  );
};

export default LeftSidebar;