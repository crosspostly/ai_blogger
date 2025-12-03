
import { GoogleGenAI } from "@google/genai";

export interface AuthCredentials {
  accessToken: string;
  expiresAt?: number;
  refreshToken?: string;
}

export class GoogleAuthManager {
  private static instance: GoogleAuthManager;
  private credentials: AuthCredentials | null = null;
  // Use `number` for browser-compatible setTimeout return type instead of NodeJS.Timeout
  private tokenRefreshTimer: number | null = null;

  private constructor() {}

  static getInstance(): GoogleAuthManager {
    if (!GoogleAuthManager.instance) {
      GoogleAuthManager.instance = new GoogleAuthManager();
    }
    return GoogleAuthManager.instance;
  }

  // Initialize with OAuth2 token (for user flow)
  async initializeWithUserToken(accessToken: string, expiresIn?: number, refreshToken?: string): Promise<void> {
    this.credentials = {
      accessToken,
      expiresAt: expiresIn ? Date.now() + (expiresIn * 1000) : undefined,
      refreshToken
    };

    if (this.credentials.expiresAt) {
      this.scheduleTokenRefresh();
    }
  }

  // Initialize with service account (for backend flow)
  async initializeWithServiceAccount(serviceAccountKey: any): Promise<void> {
    // This would typically be handled on the backend
    // For frontend use, we'd get an access token from our backend
    throw new Error('Service account authentication should be handled on the backend');
  }

  // Get current access token
  getAccessToken(): string {
    if (!this.credentials) {
      throw new Error('No authentication credentials available');
    }

    if (this.credentials.expiresAt && Date.now() >= this.credentials.expiresAt) {
      throw new Error('Access token expired');
    }

    return this.credentials.accessToken;
  }

  // Check if authenticated via OAuth
  isAuthenticated(): boolean {
    if (!this.credentials) return false;
    if (this.credentials.expiresAt && Date.now() >= this.credentials.expiresAt) return false;
    return true;
  }

  // Check if a fallback API key is present in environment
  hasApiKey(): boolean {
    // Check standard process.env.API_KEY first, then VITE specific var
    return !!(process.env.API_KEY || import.meta.env?.VITE_GOOGLE_API_KEY);
  }

  // Schedule token refresh
  private scheduleTokenRefresh(): void {
    if (!this.credentials?.expiresAt || !this.credentials.refreshToken) return;

    const refreshTime = this.credentials.expiresAt - (5 * 60 * 1000); // 5 minutes before expiry
    const delay = refreshTime - Date.now();

    if (delay > 0) {
      this.tokenRefreshTimer = window.setTimeout(() => {
        this.refreshToken();
      }, delay);
    }
  }

  // Refresh the access token
  private async refreshToken(): Promise<void> {
    if (!this.credentials?.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: import.meta.env?.VITE_GOOGLE_CLIENT_ID || '',
          client_secret: import.meta.env?.VITE_GOOGLE_CLIENT_SECRET || '',
          refresh_token: this.credentials.refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      
      this.credentials.accessToken = data.access_token;
      this.credentials.expiresAt = Date.now() + (data.expires_in * 1000);
      
      this.scheduleTokenRefresh();
    } catch (error) {
      console.error('Failed to refresh token:', error);
      this.credentials = null;
      throw error;
    }
  }

  // Clear credentials
  clearCredentials(): void {
    this.credentials = null;
    if (this.tokenRefreshTimer) {
      window.clearTimeout(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }
  }
}

// Export a function to create authenticated GoogleGenAI client
export async function createAuthenticatedGenAIClient(): Promise<GoogleGenAI> {
  const authManager = GoogleAuthManager.getInstance();
  
  // 1. Try OAuth Token
  if (authManager.isAuthenticated()) {
    const accessToken = authManager.getAccessToken();
    return new GoogleGenAI({
      apiKey: accessToken, 
    });
  }

  // 2. Try Environment API Key (process.env.API_KEY is default)
  const apiKey = process.env.API_KEY || import.meta.env?.VITE_GOOGLE_API_KEY;
  if (apiKey) {
    return new GoogleGenAI({
      apiKey: apiKey,
    });
  }

  throw new Error('User not authenticated and no API Key found. Please sign in.');
}

// OAuth2 flow functions
export function initiateGoogleOAuth(): void {
  const clientId = import.meta.env?.VITE_GOOGLE_CLIENT_ID;
  const redirectUri = encodeURIComponent(window.location.origin + '/oauth/callback');
  const scope = encodeURIComponent('https://www.googleapis.com/auth/cloud-platform');
  
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${clientId}&` +
    `redirect_uri=${redirectUri}&` +
    `response_type=code&` +
    `scope=${scope}&` +
    `access_type=offline&` +
    `prompt=consent`;
  
  window.location.href = authUrl;
}

export async function handleOAuthCallback(code: string): Promise<void> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: import.meta.env?.VITE_GOOGLE_CLIENT_ID || '',
      client_secret: import.meta.env?.VITE_GOOGLE_CLIENT_SECRET || '',
      code,
      grant_type: 'authorization_code',
      redirect_uri: window.location.origin + '/oauth/callback',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to exchange code for tokens');
  }

  const data = await response.json();
  const authManager = GoogleAuthManager.getInstance();
  await authManager.initializeWithUserToken(
    data.access_token,
    data.expires_in,
    data.refresh_token
  );
}
