/**
 * Configuration Dashboard Component
 * 
 * This component provides a comprehensive UI for managing application configuration
 * with search, filtering, import/export capabilities, and real-time updates.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useConfiguration } from '../core/ConfigurationContext';
import { useConfigSubscription } from '../hooks/useConfigurationHooks';
import {
  ConfigurationBackup,
  ImportResult,
  ImportOptions
} from '../core/ConfigurationTypes';

// ============================================================================
// Type Definitions
// ============================================================================

interface ConfigurationItem {
  key: string;
  value: any;
  category: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  isDefault: boolean;
  lastModified?: Date;
}

interface ConfigurationDashboardProps {
  className?: string;
  onClose?: () => void;
  allowExport?: boolean;
  allowImport?: boolean;
  allowReset?: boolean;
  categories?: string[];
}

// ============================================================================
// Main Dashboard Component
// ============================================================================

export const ConfigurationDashboard: React.FC<ConfigurationDashboardProps> = ({
  className = '',
  onClose,
  allowExport = true,
  allowImport = true,
  allowReset = true,
  categories
}) => {
  // ============================================================================
  // State Management
  // ============================================================================

  const config = useConfiguration();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'config' | 'status' | 'import-export'>('config');

  // Import/Export state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [exportInProgress, setExportInProgress] = useState(false);

  // ============================================================================
  // Configuration Data
  // ============================================================================

  const [configItems, setConfigItems] = useState<ConfigurationItem[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  const loadConfigurationItems = useCallback(async () => {
    try {
      // Export all configuration to get the current state
      const backup = await config.exportConfiguration(categories);
      const items: ConfigurationItem[] = [];

      Object.entries(backup.configurations || {}).forEach(([key, value]) => {
        // Infer category from key structure (e.g., "ai.temperature" -> "ai")
        const category = key.includes('.') ? key.split('.')[0] : 'general';
        
        items.push({
          key,
          value,
          category,
          type: Array.isArray(value) ? 'array' : 
                (typeof value === 'object' && value !== null) ? 'object' :
                (typeof value === 'string') ? 'string' :
                (typeof value === 'number') ? 'number' :
                (typeof value === 'boolean') ? 'boolean' : 'string' as 'string' | 'number' | 'boolean' | 'object' | 'array',
          isDefault: false, // TODO: Compare with default values
          lastModified: new Date()
        });
      });

      setConfigItems(items);

      // Extract unique categories
      const cats = [...new Set(items.map(item => item.category))].sort();
      setAvailableCategories(cats);

    } catch (error) {
      console.error('❌ Failed to load configuration items:', error);
    }
  }, [config, categories]);

  useEffect(() => {
    loadConfigurationItems();
  }, [loadConfigurationItems]);

  // ============================================================================
  // Subscription to Changes
  // ============================================================================

  useConfigSubscription(
    { categories: categories || [] },
    (change) => {
      console.log('Configuration changed:', change);
      loadConfigurationItems(); // Refresh the list
    }
  );

  // ============================================================================
  // Filtering and Search
  // ============================================================================

  const filteredItems = useMemo(() => {
    return configItems.filter(item => {
      const matchesSearch = searchTerm === '' || 
        item.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(item.value).toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || 
        item.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [configItems, searchTerm, selectedCategory]);

  // ============================================================================
  // Configuration Operations
  // ============================================================================

  const handleEdit = useCallback((item: ConfigurationItem) => {
    setEditingKey(item.key);
    setEditingValue(JSON.stringify(item.value, null, 2));
  }, []);

  const handleSave = useCallback(async () => {
    if (!editingKey) return;

    try {
      const parsedValue = JSON.parse(editingValue);
      await config.setValue(editingKey, parsedValue);
      setEditingKey(null);
      setEditingValue('');
      await loadConfigurationItems();
    } catch (error) {
      alert('Invalid JSON format. Please check your input.');
      console.error('Failed to save configuration:', error);
    }
  }, [editingKey, editingValue, config, loadConfigurationItems]);

  const handleReset = useCallback(async (key: string) => {
    if (window.confirm(`Reset "${key}" to default value?`)) {
      try {
        await config.resetValue(key);
        await loadConfigurationItems();
      } catch (error) {
        console.error('Failed to reset configuration:', error);
      }
    }
  }, [config, loadConfigurationItems]);

  const handleRemove = useCallback(async (key: string) => {
    if (window.confirm(`Remove configuration "${key}"?`)) {
      try {
        await config.removeValue(key);
        await loadConfigurationItems();
      } catch (error) {
        console.error('Failed to remove configuration:', error);
      }
    }
  }, [config, loadConfigurationItems]);

  // ============================================================================
  // Import/Export Operations
  // ============================================================================

  const handleExport = useCallback(async () => {
    try {
      setExportInProgress(true);
      const backup = await config.exportConfiguration(categories);
      
      // Create download
      const blob = new Blob([JSON.stringify(backup, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `config-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. See console for details.');
    } finally {
      setExportInProgress(false);
    }
  }, [config, categories]);

  const handleImport = useCallback(async () => {
    if (!importFile) return;

    try {
      const text = await importFile.text();
      const backup: ConfigurationBackup = JSON.parse(text);
      
      const options: ImportOptions = {
        overwriteExisting: true,
        validateValues: true,
        importSchemas: true,
        conflictResolution: 'overwrite'
      };

      const result = await config.importConfiguration(backup, options);
      setImportResult(result);
      
      if (result.success) {
        await loadConfigurationItems();
      }
      
    } catch (error) {
      console.error('Import failed:', error);
      setImportResult({
        success: false,
        importedCount: 0,
        skippedCount: 0,
        errorCount: 1,
        conflicts: [],
        errors: [{
          error: error instanceof Error ? error.message : 'Import failed',
          severity: 'error' as const
        }]
      });
    }
  }, [importFile, config, loadConfigurationItems]);

  // ============================================================================
  // Utility Functions
  // ============================================================================

  const formatValue = (value: any): string => {
    if (typeof value === 'string' && value.length > 50) {
      return value.substring(0, 50) + '...';
    }
    return JSON.stringify(value);
  };

  const getValueColor = (type: string): string => {
    switch (type) {
      case 'string': return 'text-blue-600';
      case 'number': return 'text-green-600';
      case 'boolean': return 'text-purple-600';
      case 'object': return 'text-orange-600';
      case 'array': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  // ============================================================================
  // Render Methods
  // ============================================================================

  const renderConfigurationList = () => (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1 min-w-64">
          <input
            type="text"
            placeholder="Search configuration keys or values..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Categories</option>
          {availableCategories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showAdvanced}
            onChange={(e) => setShowAdvanced(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          Show Advanced
        </label>
      </div>

      {/* Configuration Items */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No configuration items found matching your filters.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredItems.map((item) => (
              <div key={item.key} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">{item.key}</span>
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                        {item.category}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded ${getValueColor(item.type)} bg-opacity-10`}>
                        {item.type}
                      </span>
                    </div>
                    
                    {editingKey === item.key ? (
                      <div className="mt-2">
                        <textarea
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          className="w-full h-24 px-3 py-2 border border-gray-300 rounded font-mono text-sm"
                          placeholder="Enter JSON value..."
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={handleSave}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingKey(null)}
                            className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className={`text-sm ${getValueColor(item.type)}`}>
                        {formatValue(item.value)}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-2 text-gray-400 hover:text-blue-600"
                      title="Edit"
                    >
                      ✏️
                    </button>
                    
                    {allowReset && (
                      <button
                        onClick={() => handleReset(item.key)}
                        className="p-2 text-gray-400 hover:text-orange-600"
                        title="Reset to Default"
                      >
                        🔄
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleRemove(item.key)}
                      className="p-2 text-gray-400 hover:text-red-600"
                      title="Remove"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderStatus = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">System Status</h3>
        
        {config.status ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Health Status:</span>
                <span className={`font-medium ${config.status.healthy ? 'text-green-600' : 'text-red-600'}`}>
                  {config.status.healthy ? '✅ Healthy' : '❌ Unhealthy'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span>Total Items:</span>
                <span className="font-medium">{config.status.statistics.totalConfigurations}</span>
              </div>
              
              <div className="flex justify-between">
                <span>Modified Items:</span>
                <span className="font-medium">{config.status.statistics.modifiedConfigurations}</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Cache Hits:</span>
                <span className="font-medium">{config.getCacheStats()?.hits || 0}</span>
              </div>
              
              <div className="flex justify-between">
                <span>Cache Size:</span>
                <span className="font-medium">{config.getCacheStats()?.size || 0}</span>
              </div>
              
              <div className="flex justify-between">
                <span>Error Count:</span>
                <span className="font-medium text-red-600">
                  {config.status.statistics.errorConfigurations}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-gray-500">Loading status...</div>
        )}
      </div>

      <button
        onClick={config.refreshStatus}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Refresh Status
      </button>

      <button
        onClick={config.clearCache}
        className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 ml-2"
      >
        Clear Cache
      </button>
    </div>
  );

  const renderImportExport = () => (
    <div className="space-y-6">
      {/* Export Section */}
      {allowExport && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Export Configuration</h3>
          <p className="text-gray-600 mb-4">
            Export your current configuration as a JSON backup file.
          </p>
          <button
            onClick={handleExport}
            disabled={exportInProgress}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {exportInProgress ? 'Exporting...' : 'Export Configuration'}
          </button>
        </div>
      )}

      {/* Import Section */}
      {allowImport && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Import Configuration</h3>
          <p className="text-gray-600 mb-4">
            Import configuration from a JSON backup file. This will overwrite existing values.
          </p>
          
          <div className="space-y-4">
            <input
              type="file"
              accept=".json"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            
            {importFile && (
              <button
                onClick={handleImport}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Import Configuration
              </button>
            )}
          </div>

          {/* Import Result */}
          {importResult && (
            <div className={`mt-4 p-4 rounded ${importResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {importResult.success ? (
                <div>
                  ✅ Import successful! Imported {importResult.importedCount} items.
                </div>
              ) : (
                <div>
                  ❌ Import failed with {importResult.errorCount} errors:
                  <ul className="mt-2 list-disc list-inside">
                    {importResult.errors?.map((error, index) => (
                      <li key={index}>{error.error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <div className={`configuration-dashboard bg-gray-50 ${className}`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Configuration Dashboard</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-4 mt-4">
          <button
            onClick={() => setActiveTab('config')}
            className={`px-3 py-2 text-sm font-medium rounded ${
              activeTab === 'config'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Configuration
          </button>
          <button
            onClick={() => setActiveTab('status')}
            className={`px-3 py-2 text-sm font-medium rounded ${
              activeTab === 'status'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Status
          </button>
          <button
            onClick={() => setActiveTab('import-export')}
            className={`px-3 py-2 text-sm font-medium rounded ${
              activeTab === 'import-export'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Import/Export
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {config.error && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">
            ❌ Configuration Error: {config.error}
          </div>
        )}

        {activeTab === 'config' && renderConfigurationList()}
        {activeTab === 'status' && renderStatus()}
        {activeTab === 'import-export' && renderImportExport()}
      </div>
    </div>
  );
};

export default ConfigurationDashboard;