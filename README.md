# 🚀 YourSpace

**Your digital command center, beautifully crafted.**

YourSpace is a modern, all-in-one desktop application built with Electron and Vue 3 that serves as your personal digital command center. It combines productivity tools, system monitoring, and entertainment in a sleek, customizable interface.

---

## ✨ Key Features

### 📱 Application Hub
- Track and monitor installed applications in real-time
- View detailed app usage statistics
- Quick launch and comprehensive app management
- Custom app categorization with color coding

### ✅ Smart Todo Management
- Create and organize tasks with priority levels (Low/Medium/High)
- Set due dates with precise time control
- Organize tasks into color-coded folders
- Flexible tag system for advanced categorization
- Smart notifications with sound alerts (24h, 5h, 1h, 30m, 15m before deadlines)
- Filter tasks by status (All/Active/Completed)

### 📧 Email Aggregator
- Connect multiple Google accounts via OAuth 2.0
- Unified inbox view for all connected accounts
- Real-time email synchronization (every 5 minutes)
- Search across all emails with instant results
- Filter by account, read/unread status
- Mark emails as read/unread with one click
- Secure token encryption (AES-256-GCM)
- Background sync with automatic token refresh

### 🎵 Music Controls
- "Now Playing" widget for current track
- Visual audio equalizer animation

### 📊 System Monitoring
- Real-time CPU and system statistics
- Resource usage tracking
- Comprehensive performance metrics

### 👤 User Management
- Secure authentication system with JWT tokens
- User profile management
- Cloud sync for tasks and app data across devices
- Guest mode support for offline use

---

## 🎨 Design Highlights

- **Modern Glass-morphism UI** with seamless light/dark theme support
- **Smooth animations** and fluid transitions throughout the interface
- **Customizable color schemes** for personalization
- **Responsive layout** with intuitive sidebar navigation
- **Toast notifications** with elegant progress bars
- **System tray integration** for background operation

---

## 🔧 Technical Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | Vue 3 with Composition API, TypeScript |
| **Backend** | Electron, Node.js |
| **Database** | PostgreSQL with Prisma ORM |
| **Styling** | SCSS with custom theme system |
| **State Management** | Vue Composition API with custom stores |
| **Build Tools** | Vite for fast development and builds |

---

## ⚙️ Setup Instructions

### Google OAuth Configuration (for Email Aggregator)

To use the Email Aggregator feature, you need to set up Google OAuth credentials:

1. **Create a Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Note your project name for reference

2. **Enable Gmail API**
   - In the Google Cloud Console, navigate to "APIs & Services" > "Library"
   - Search for "Gmail API"
   - Click "Enable"

3. **Configure OAuth Consent Screen**
   - Go to "APIs & Services" > "OAuth consent screen"
   - Choose "External" user type (or "Internal" if using Google Workspace)
   - Fill in the required fields:
     - App name: "YourSpace"
     - User support email: your email
     - Developer contact: your email
   - Add scopes:
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/gmail.modify`
   - Add test users (your email addresses that will use the app)
   - Save and continue

4. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose **"Desktop app"** as application type
   - Name it "YourSpace Desktop"
   - **Important**: Add authorized redirect URI: `http://localhost:3000`
   - Click "Create"
   - Copy the Client ID and Client Secret

5. **Update Environment Variables**
   - Open your `.env` file in the project root
   - Replace the placeholder values:
     ```env
     GOOGLE_CLIENT_ID="your_actual_client_id_here"
     GOOGLE_CLIENT_SECRET="your_actual_client_secret_here"
     ```
   - Save the file

6. **Restart the Application**
   - Close YourSpace completely
   - Restart the application
   - The Email Aggregator feature should now work

### Environment Variables

Make sure your `.env` file contains all required variables:

```env
# Database
DATABASE_URL="your_database_url"

# Authentication
JWT_SECRET="your_jwt_secret"

# OAuth Encryption (generate with: openssl rand -hex 32)
OAUTH_ENCRYPTION_KEY="your_encryption_key"

# Google OAuth
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"

# Optional
NODE_ENV="development"
LOG_LEVEL="info"
```

---

## 💡 Unique Features

| Feature | Description |
|---------|-------------|
| **⏰ Deadline Notifications** | Get reminded about upcoming tasks with custom sound alerts |
| **📊 App Usage Tracking** | Monitor time spent in different applications |
| **⚡ Quick Access Bar** | Pin frequently used apps for instant launch |
| **🔄 Smart Sync** | Automatic synchronization across multiple devices |
| **📴 Offline Support** | Full functionality without internet connection |
| **🖥️ System Tray** | Minimize to tray with background operation |

---

## 🛡️ Security

- Secure authentication with JWT tokens
- Local data encryption for sensitive information
- Safe app launch isolation for security
- Privacy-focused design with minimal data collection

---

## 🎯 Target Users

- **Productivity enthusiasts** who want to track and optimize their app usage
- **Task managers** needing a robust todo system with deadlines and notifications
- **System monitors** who want quick access to system statistics
- **Casual users** looking for an elegant desktop companion

---

## 🌟 Why YourSpace?

Unlike traditional productivity apps, YourSpace combines multiple essential tools in one beautiful package. It's not just a task manager or an app launcher – it's your personal digital ecosystem that grows with you. The combination of visual appeal, powerful features, and seamless integration makes it the perfect companion for your daily digital life.

---

**Your digital command center, beautifully crafted.** 🚀