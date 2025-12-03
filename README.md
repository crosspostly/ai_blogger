<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# AI Blogger Hub - OAuth2 Authentication

This React application generates AI-powered content using Google's Generative Language API with secure OAuth2 authentication.

## 🔐 Authentication Update

**Important:** This application now uses OAuth2 authentication instead of API keys for better security and compatibility with Google's latest API requirements.

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- Google Cloud Project with OAuth2 credentials

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Google OAuth2

1. **Create/Select a Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one

2. **Enable Required APIs**
   - Enable "Generative Language API"
   - Enable "Google Identity" if not already enabled

3. **Create OAuth2 Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client IDs"
   - Select "Web application" as the application type
   - Add authorized redirect URIs:
     - Development: `http://localhost:5173/oauth/callback`
     - Production: `https://yourdomain.com/oauth/callback`

4. **Configure OAuth Consent Screen**
   - Go to "APIs & Services" → "OAuth consent screen"
   - Configure with your app details
   - Add required scopes: `https://www.googleapis.com/auth/cloud-platform`

### 3. Set Up Environment Variables
```bash
# Copy the example file
cp .env.example .env.local

# Edit .env.local with your credentials
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
VITE_GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

### 4. Run the Application
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## 🔄 Authentication Flow

1. **Sign In**: Users sign in with their Google account
2. **OAuth2 Authorization**: Grant permission for Generative Language API access
3. **Token Management**: Automatic token refresh and secure storage
4. **API Access**: All API calls use OAuth2 bearer tokens

## 🏗️ Architecture

### Frontend Components
- **App.tsx**: Main application with OAuth2 flow management
- **SignIn.tsx**: Google OAuth2 sign-in interface
- **OAuthCallback.tsx**: Handles OAuth2 callback and token exchange
- **authService.ts**: Centralized authentication management

### Authentication Service
- **GoogleAuthManager**: Singleton pattern for credential management
- **Token Refresh**: Automatic token renewal
- **Error Handling**: Comprehensive auth error management

### API Integration
- **geminiService.ts**: Updated to use OAuth2 authentication
- **Bearer Token Authentication**: All API requests use `Authorization: Bearer <token>`
- **Video Downloads**: Properly authenticated video file downloads

## 🔧 Alternative Authentication Options

### Service Account (Backend Only)
For production deployments, consider using service account authentication:

```python
# Example backend implementation
from google.auth.transport.requests import Request
from google.oauth2 import service_account
import requests

credentials = service_account.Credentials.from_service_account_file(
    'service-account.json',
    scopes=['https://www.googleapis.com/auth/cloud-platform']
)
credentials.refresh(Request())

headers = {
    'Authorization': f'Bearer {credentials.token}',
    'Content-Type': 'application/json'
}
```

### Alternative AI Services
If Google's API limits are restrictive, consider these alternatives:

| Service | Free Tier | Features | Integration |
|---------|-----------|----------|-------------|
| [OpenRouter](https://openrouter.ai) | 1-2k requests/day | Multiple LLMs | REST API |
| [Replicate](https://replicate.com) | 50-100 requests/month | Image/Video/Text | REST API |
| [SeaArt](https://seaart.ai) | Free credits | Text/Image generation | REST API |

## 🛠️ Development Notes

### OAuth2 Security
- Tokens are stored in memory only (no localStorage)
- Automatic token refresh prevents session expiration
- Proper error handling for expired/invalid tokens

### API Error Handling
- 401/403 errors trigger re-authentication
- User-friendly error messages
- Graceful fallback for video generation failures

### Environment Variables
- Never commit `.env.local` to version control
- Use different credentials for development/production
- Secure storage of client secrets

## 📚 API Documentation

- [Google Cloud Authentication](https://cloud.google.com/docs/authentication)
- [OAuth2 Implementation Guide](https://developers.google.com/identity/protocols/oauth2)
- [Generative Language API Docs](https://ai.google.dev/docs)

## 🐛 Troubleshooting

### Common Issues

**"redirect_uri_mismatch" Error**
- Ensure the redirect URI in Google Console matches exactly
- Check for trailing slashes or protocol differences

**"invalid_client" Error**
- Verify client ID and client secret are correct
- Ensure OAuth2 is properly configured in Google Console

**"access_denied" Error**
- User denied consent - they need to grant permissions
- Check OAuth consent screen configuration

**Token Expiration Issues**
- Tokens automatically refresh when needed
- If issues persist, clear authentication and sign in again

### Debug Mode
Enable debug logging by setting:
```bash
VITE_DEBUG_AUTH=true
```

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

Contributions welcome! Please ensure:
- OAuth2 security best practices are followed
- No sensitive credentials are committed
- Tests pass for authentication flows
