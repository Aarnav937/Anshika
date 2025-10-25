import React from 'react';
import { Wifi, WifiOff, Brain, Loader2, AlertCircle } from 'lucide-react';

interface StatusIndicatorProps {
  mode: 'online' | 'offline';
  isLoading?: boolean;
  isProcessing?: boolean;
  isError?: boolean;
  progress?: number;
  modelName?: string;
  className?: string;
}

export const EnhancedStatusIndicator: React.FC<StatusIndicatorProps> = ({
  mode,
  isLoading = false,
  isProcessing = false,
  isError = false,
  progress = 0,
  modelName,
  className = ''
}) => {
  const getStatusConfig = () => {
    if (isError) {
      return {
        icon: AlertCircle,
        text: 'Connection Error',
        color: 'text-red-400',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/20',
        pulseColor: 'bg-red-500'
      };
    }

    if (isLoading) {
      return {
        icon: Loader2,
        text: 'Initializing...',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/20',
        pulseColor: 'bg-blue-500'
      };
    }

    if (isProcessing) {
      return {
        icon: Brain,
        text: 'AI Thinking...',
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/10',
        borderColor: 'border-purple-500/20',
        pulseColor: 'bg-purple-500'
      };
    }

    if (mode === 'online') {
      return {
        icon: Wifi,
        text: 'Connected to Gemini AI',
        color: 'text-green-400',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/20',
        pulseColor: 'bg-green-500'
      };
    }

    return {
      icon: WifiOff,
      text: `Using ${modelName || 'Local'} Model`,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/20',
      pulseColor: 'bg-orange-500'
    };
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={`relative ${className}`}>
      <div className={`flex items-center gap-3 px-4 py-3 rounded-full text-sm font-medium shadow-lg backdrop-blur-md border state-transition ${config.bgColor} ${config.borderColor}`}>
        {/* Animated background pulse */}
        <div className={`absolute inset-0 rounded-full opacity-20 ${config.pulseColor} ${isProcessing ? 'pulse-glow' : ''}`} />

        {/* Icon with enhanced animations */}
        <div className="relative z-10 flex items-center justify-center">
          {isLoading ? (
            <Loader2 className={`w-4 h-4 ${config.color} animate-spin`} />
          ) : isProcessing ? (
            <div className="relative">
              <Brain className={`w-4 h-4 ${config.color} animate-pulse`} />
              {/* Thinking dots */}
              <div className="absolute -top-1 -right-1 flex space-x-0.5">
                <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          ) : (
            <Icon className={`w-4 h-4 ${config.color} ${mode === 'online' ? 'animate-pulse' : ''}`} />
          )}
        </div>

        {/* Status text with typing animation for processing */}
        <span className={`relative z-10 ${config.color}`}>
          {isProcessing && progress > 0 ? (
            <span className="flex items-center gap-2">
              <span>Processing</span>
              <span className="text-xs opacity-75">({Math.round(progress)}%)</span>
            </span>
          ) : (
            config.text
          )}
        </span>

        {/* Progress bar for processing */}
        {isProcessing && (
          <div className="relative z-10 w-16 h-1 bg-gray-600 rounded-full overflow-hidden">
            <div
              className={`h-full ${config.pulseColor} rounded-full transition-all duration-300 ease-out`}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Connection quality indicator for online mode */}
        {mode === 'online' && !isLoading && !isProcessing && !isError && (
          <div className="relative z-10 flex items-center gap-1">
            <div className="flex space-x-0.5">
              <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse" />
              <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
              <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
            </div>
          </div>
        )}
      </div>

      {/* Floating particles for active states */}
      {(isProcessing || (mode === 'online' && !isLoading)) && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1 left-2 w-1 h-1 bg-purple-400 rounded-full opacity-60 animate-ping" />
          <div className="absolute top-2 right-3 w-0.5 h-0.5 bg-blue-400 rounded-full opacity-40 animate-ping" style={{ animationDelay: '0.5s' }} />
          <div className="absolute bottom-1 left-4 w-0.5 h-0.5 bg-purple-400 rounded-full opacity-50 animate-ping" style={{ animationDelay: '1s' }} />
        </div>
      )}
    </div>
  );
};

// Compact status indicator for smaller spaces
export const CompactStatusIndicator: React.FC<Omit<StatusIndicatorProps, 'className'>> = (props) => (
  <EnhancedStatusIndicator {...props} className="text-xs px-3 py-2" />
);

// Detailed status card for expanded view
export const DetailedStatusCard: React.FC<StatusIndicatorProps & {
  responseTime?: number;
  tokensUsed?: number;
  modelVersion?: string;
}> = ({
  mode,
  isLoading,
  isProcessing,
  isError,
  progress,
  modelName,
  responseTime,
  tokensUsed,
  modelVersion
}) => {
  const config = (() => {
    if (isError) return { color: 'red' };
    if (isLoading) return { color: 'blue' };
    if (isProcessing) return { color: 'purple' };
    return mode === 'online' ? { color: 'green' } : { color: 'orange' };
  })();

  return (
    <div className={`bg-gray-900/60 backdrop-blur-md rounded-xl shadow-2xl border p-4 state-transition card-hover ${config.color === 'green' ? 'border-green-500/20' : config.color === 'orange' ? 'border-orange-500/20' : config.color === 'purple' ? 'border-purple-500/20' : 'border-red-500/20'}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-white">AI Status</h3>
        <EnhancedStatusIndicator
          mode={mode}
          isLoading={isLoading}
          isProcessing={isProcessing}
          isError={isError}
          progress={progress}
          modelName={modelName}
          className="text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-400">Response Time</span>
          <div className="text-white font-mono">
            {responseTime ? `${responseTime}ms` : '--'}
          </div>
        </div>
        <div>
          <span className="text-gray-400">Tokens Used</span>
          <div className="text-white font-mono">
            {tokensUsed || '--'}
          </div>
        </div>
        <div className="col-span-2">
          <span className="text-gray-400">Model Version</span>
          <div className="text-white font-mono">
            {modelVersion || modelName || '--'}
          </div>
        </div>
      </div>

      {/* Progress visualization */}
      {isProcessing && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span>Processing Progress</span>
            <span>{Math.round(progress || 0)}%</span>
          </div>
          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-300`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedStatusIndicator;