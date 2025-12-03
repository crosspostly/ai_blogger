import React, { useEffect, useState } from 'react';
import { handleOAuthCallback } from '../services/authService';

interface OAuthCallbackProps {
  onAuthSuccess: () => void;
  onAuthError: (error: string) => void;
}

export function OAuthCallback({ onAuthSuccess, onAuthError }: OAuthCallbackProps) {
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const processCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');

        if (error) {
          throw new Error(`OAuth error: ${error}`);
        }

        if (!code) {
          throw new Error('No authorization code received');
        }

        // Use the centralized function to exchange the code for tokens
        await handleOAuthCallback(code);

        // Clean up the URL
        window.history.replaceState({}, document.title, '/oauth/callback');
        
        setIsProcessing(false);
        onAuthSuccess();
      } catch (error) {
        console.error('OAuth callback error:', error);
        setIsProcessing(false);
        onAuthError(error instanceof Error ? error.message : 'Authentication failed');
      }
    };

    processCallback();
  }, [onAuthSuccess, onAuthError]);

  if (isProcessing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Completing authentication...</p>
        </div>
      </div>
    );
  }

  return null; // This component will redirect or be unmounted after auth
}