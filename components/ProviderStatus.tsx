
import React from 'react';
import { fallbackService } from '../services/fallbackService';
import { GoogleAuthManager } from '../services/authService';

interface ProviderStatusProps {
  className?: string;
}

export function ProviderStatus({ className = '' }: ProviderStatusProps) {
  const authManager = GoogleAuthManager.getInstance();
  const isGoogleAuth = authManager.isAuthenticated();
  const hasApiKey = authManager.hasApiKey();
  const fallbackProviders = fallbackService.getAvailableProviders();

  return (
    <div className={`bg-gray-800 rounded-lg p-4 text-sm ${className}`}>
      <h3 className="font-semibold mb-2 text-green-400">Provider Status</h3>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span>Google API Access:</span>
          {isGoogleAuth ? (
             <span className="px-2 py-1 rounded text-xs bg-green-600 text-white">Authenticated (OAuth)</span>
          ) : hasApiKey ? (
             <span className="px-2 py-1 rounded text-xs bg-blue-600 text-white">API Key Mode</span>
          ) : (
             <span className="px-2 py-1 rounded text-xs bg-red-600 text-white">Not Configured</span>
          )}
        </div>

        {fallbackProviders.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <p className="text-gray-400 mb-2">Fallback Providers:</p>
            {fallbackProviders.map(provider => (
              <div key={provider} className="flex items-center justify-between text-xs">
                <span className="text-gray-300">{provider}:</span>
                <span className="bg-blue-600 text-white px-2 py-1 rounded">Available</span>
              </div>
            ))}
          </div>
        )}

        {fallbackProviders.length === 0 && !isGoogleAuth && !hasApiKey && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <p className="text-yellow-400 text-xs">
              ⚠️ No AI providers configured. Please set up OAuth2 or add fallback provider API keys.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}