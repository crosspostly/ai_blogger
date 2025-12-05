
import React from 'react';
import { getKeySource } from '../config/apiConfig';

interface ProviderStatusProps {
  className?: string;
}

export function ProviderStatus({ className = '' }: ProviderStatusProps) {
  const source = getKeySource('gemini');
  
  let statusBadge;
  let labelText;

  switch (source) {
      case 'env':
          statusBadge = <span className="px-2 py-1 rounded text-xs bg-green-600 text-white">Environment (Secure)</span>;
          labelText = "Configured via .env";
          break;
      case 'custom':
          statusBadge = <span className="px-2 py-1 rounded text-xs bg-blue-600 text-white">Custom Key (Browser)</span>;
          labelText = "Saved in LocalStorage";
          break;
      default:
          statusBadge = <span className="px-2 py-1 rounded text-xs bg-red-600 text-white">Missing Config</span>;
          labelText = "No key detected";
  }

  return (
    <div className={`bg-gray-800 rounded-lg p-4 text-sm ${className}`}>
      <h3 className="font-semibold mb-2 text-green-400">API Configuration</h3>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span>Gemini API:</span>
          {statusBadge}
        </div>
        <div className="text-xs text-gray-500 mt-1">
            Source: {labelText}
        </div>
      </div>
    </div>
  );
}
