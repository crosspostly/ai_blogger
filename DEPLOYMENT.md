# Production Deployment Guide

This guide covers deploying the AI Blogger Hub, a client-side application using OAuth2 authentication and fallback providers.

## 🔐 Authentication

This application uses an **OAuth2 User Authentication** flow. Users sign in with their Google accounts to access the Generative Language API.

**Pros:**
- No server-side credential management required.
- Users leverage their own Google Cloud quotas.
- Simplified client-side deployment.

**Cons:**
- Requires user consent for API access.
- Each user needs their Google Cloud project to have billing set up for API usage.

## 🚀 Deployment Platforms

### Vercel / Netlify (Recommended)

1. **Environment Variables**
   Set these in your hosting provider's dashboard:
   ```bash
   VITE_GOOGLE_CLIENT_ID=your_client_id
   VITE_GOOGLE_CLIENT_SECRET=your_client_secret
   VITE_OPENROUTER_API_KEY=your_openrouter_key (optional fallback)
   VITE_REPLICATE_API_KEY=your_replicate_key (optional fallback)
   VITE_SEAART_API_KEY=your_seaart_key (optional fallback)
   ```

2. **OAuth2 Redirect URI**
   In your Google Cloud Console, add your production URL to the "Authorized redirect URIs":
   - **Vercel**: `https://your-domain.vercel.app/oauth/callback`
   - **Netlify**: `https://your-domain.netlify.app/oauth/callback`

3. **Deployment Command**
   - The build command is `npm run build`.
   - The publish directory is `dist`.

## 📊 Monitoring and Logging

### Error Tracking

It's crucial to monitor authentication and API errors in production.

```javascript
// In your error handling logic (e.g., useAIBloggerGenerator hook)
if (error.message.includes('401') || error.message.includes('403')) {
  // Integrate with a logging service like Sentry, LogRocket, etc.
  console.error('Authentication failure detected:', {
    error: error.message,
    timestamp: new Date().toISOString(),
    provider: 'google'
  });
}
```

### Usage Monitoring

Track API usage to understand costs and identify potential abuse.

```javascript
// Example client-side tracker
const usageTracker = {
  google: { requests: 0, errors: 0 },
  openrouter: { requests: 0, errors: 0 },
};

function trackUsage(provider, success) {
  if (usageTracker[provider]) {
    usageTracker[provider].requests++;
    if (!success) usageTracker[provider].errors++;
  }
}
```

## 🛡️ Security Best Practices

### 1. Environment Variable Security
Ensure your `VITE_` variables are correctly configured in your deployment environment and not exposed publicly if they are sensitive (like fallback API keys). The Google Client Secret is used during the token exchange but should be handled carefully.

### 2. Token Storage
The application correctly stores OAuth2 tokens in memory only, not in `localStorage`, to reduce the risk of XSS attacks.

```javascript
// from services/authService.ts
class TokenManager {
  private accessToken: string | null = null;
  // ... stores tokens in memory
}
```

### 3. Rate Limiting
While server-side rate limiting is more robust, you can implement client-side checks to prevent accidental spamming of the API.

```javascript
// Example client-side rate limiter
class RateLimiter {
  private requestTimestamps: number[] = [];
  private readonly maxRequests = 10; // per minute
  private readonly windowMs = 60000;

  canMakeRequest(): boolean {
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter(
      (ts) => now - ts < this.windowMs
    );
    return this.requestTimestamps.length < this.maxRequests;
  }

  recordRequest() {
    this.requestTimestamps.push(Date.now());
  }
}
```

## 🔍 Troubleshooting Production Issues

### Common Problems

1. **OAuth2 Redirect Mismatch**
   - **Symptom:** "redirect_uri_mismatch" error from Google.
   - **Solution:** Verify the redirect URI in your Google Cloud Console exactly matches the one your deployed app uses, including `https`, `www`, and any trailing slashes.

2.  **CORS Errors**
    - **Symptom:** Network errors related to Cross-Origin Resource Sharing.
    - **Solution:** Ensure your "Authorized JavaScript origins" in the Google Cloud Console are correctly set to your production domain (e.g., `https://your-domain.vercel.app`).

3. **Rate Limiting by APIs**
   - **Symptom:** `429 Too Many Requests` errors.
   - **Solution:** The user may be hitting their own Google Cloud quota. Inform them of this possibility. For fallback services, ensure your keys have sufficient quotas.

## 📋 Deployment Checklist

- [ ] OAuth2 redirect URIs are configured for the production domain.
- [ ] All required environment variables (`VITE_*`) are set in the deployment platform.
- [ ] Fallback provider API keys are configured (if used).
- [ ] Error monitoring/logging is in place.
- [ ] HTTPS is enforced on the production site.
