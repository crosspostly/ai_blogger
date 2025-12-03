import React from 'react';
import { initiateGoogleOAuth } from '../services/authService';

interface SignInProps {
  onSignIn: () => void;
}

export function SignIn({ onSignIn }: SignInProps) {
  const handleSignIn = () => {
    initiateGoogleOAuth();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4 text-center">
      <h1 className="text-3xl font-bold mb-4">Welcome to AI Blogger Hub</h1>
      <p className="mb-6 max-w-md">
        To generate content with Google's Generative Language API, you need to sign in with your Google account. 
        This allows us to authenticate securely with OAuth2 instead of using API keys.
      </p>
      
      <div className="bg-gray-800 rounded-lg p-6 mb-6 max-w-md w-full">
        <h2 className="text-xl font-semibold mb-3">Why OAuth2 Authentication?</h2>
        <ul className="text-left text-sm text-gray-300 space-y-2">
          <li>• More secure than API keys</li>
          <li>• Supports advanced AI models like Veo</li>
          <li>• Automatic token refresh</li>
          <li>• No need to manage API keys manually</li>
        </ul>
      </div>

      <button
        onClick={handleSignIn}
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 mb-4"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Sign in with Google
      </button>
      
      <p className="text-sm text-gray-400 mb-2">
        After signing in, you'll be redirected back to continue with content generation.
      </p>
      
      <p className="text-xs text-gray-500">
        By signing in, you grant this app access to Google's Generative Language API. 
        You can revoke this access at any time from your Google Account settings.
      </p>
      
      <div className="mt-6 text-sm">
        <p className="text-gray-400">
          For more information about Google Cloud pricing, visit{' '}
          <a 
            href="https://cloud.google.com/ai-platform/pricing" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="underline hover:text-white"
          >
            cloud.google.com/ai-platform/pricing
          </a>.
        </p>
      </div>
    </div>
  );
}