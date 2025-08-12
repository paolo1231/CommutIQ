# CommutIQ - AI-Powered Commute Learning App

CommutIQ is a React Native mobile app that transforms commute time into learning opportunities using AI-generated courses tailored to users' interests and available time.

## 🚀 Features

- **AI-Generated Courses**: Personalized learning content based on user interests and commute duration
- **Offline Support**: Download lessons for offline listening during commutes
- **Progress Tracking**: Comprehensive learning progress with analytics
- **Interactive Elements**: Quizzes, reflections, and discussions within lessons
- **Audio Learning**: High-quality text-to-speech for hands-free learning
- **Real-time Sync**: Cross-device synchronization of progress and preferences

## 📱 Tech Stack

### Frontend
- **React Native** (0.79.5) with **Expo** (53.0.20)
- **TypeScript** for type safety
- **React Navigation 6** for navigation
- **React Native Track Player** for audio playback
- **React Native Reanimated** for smooth animations

### Backend
- **Supabase** for database, authentication, and storage
- **PostgreSQL** database with Row Level Security
- **Edge Functions** for serverless computing
- **Storage buckets** for audio files and user uploads

### Services
- **OpenAI API** for content generation (planned)
- **ElevenLabs** for text-to-speech (planned)
- **Analytics** for user behavior tracking

## 🛠️ Development Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- Supabase CLI (`npm install -g supabase`)
- iOS Simulator (macOS) or Android Emulator

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/commutiq-expo.git
   cd commutiq-expo
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Fill in your environment variables:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   EXPO_PUBLIC_ENVIRONMENT=development
   ```

4. **Initialize Supabase locally**
   ```bash
   npm run db:init
   npm run db:start
   ```

5. **Run database migrations and seed data**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

6. **Start the development server**
   ```bash
   npm start
   ```

7. **Run on device/simulator**
   - iOS: `npm run ios`
   - Android: `npm run android`
   - Web: `npm run web`

## 🗄️ Database Schema

### Core Tables

- **user_profiles**: User settings, preferences, and subscription info
- **subjects**: Available learning subjects with categories
- **user_subjects**: User's selected subjects with priorities
- **courses**: AI-generated courses for users
- **lessons**: Individual lessons within courses
- **user_progress**: Learning progress tracking
- **lesson_interactions**: Quizzes, reflections, discussions
- **user_interaction_responses**: User responses to interactions

### Storage

- **lesson-audio**: Audio files for lessons
- **user-uploads**: User-generated content (profile pictures, etc.)

## 🔧 Available Scripts

### Development
- `npm start` - Start Expo development server
- `npm run ios` - Run on iOS simulator
- `npm run android` - Run on Android emulator
- `npm run web` - Run on web browser

### Database Management
- `npm run db:init` - Initialize Supabase project
- `npm run db:start` - Start local Supabase
- `npm run db:stop` - Stop local Supabase
- `npm run db:migrate` - Apply database migrations
- `npm run db:seed` - Apply seed data
- `npm run db:validate` - Validate database connection

### Deployment
- `npm run deploy:staging` - Deploy to staging
- `npm run deploy:production` - Deploy to production

### Code Quality
- `npm run lint` - Run ESLint

## 📁 Project Structure

```
commutiq-expo/
├── app/                    # Expo Router app directory
├── components/            # Reusable React components
├── constants/            # App constants and configuration
├── lib/                  # External library configurations
├── screens/              # Screen components
├── services/             # Business logic and API services
├── types/                # TypeScript type definitions
├── utils/                # Utility functions
├── supabase/             # Database migrations and config
│   ├── migrations/       # SQL migration files
│   ├── seed.sql         # Initial data
│   └── config.toml      # Supabase configuration
└── scripts/              # Build and deployment scripts
```

## 🏗️ Architecture

### Service Layer
- **SupabaseService**: Database operations, auth, real-time subscriptions
- **DatabaseService**: Database initialization and health checks
- **AudioService**: Audio playbook and management (planned)
- **AIService**: Content generation integration (planned)

### State Management
- React Context for global state
- Local state with React hooks
- Offline-first architecture with sync queues

### Authentication Flow
1. Email/password signup/signin
2. Auto-create user profile
3. Onboarding: commute time + subject selection
4. Generate initial courses based on preferences

## 📱 App Flow

### Onboarding
1. **Welcome** - Introduction to CommutIQ
2. **Auth** - Sign up or log in
3. **Commute Setup** - Set commute duration
4. **Subject Selection** - Choose learning interests
5. **Course Generation** - AI creates personalized courses

### Main App
1. **Home** - Daily learning dashboard
2. **Courses** - Browse and manage courses
3. **Player** - Audio lesson playback
4. **Progress** - Learning analytics
5. **Profile** - Settings and preferences

## 🔐 Security

### Database Security
- Row Level Security (RLS) enabled on all tables
- User can only access their own data
- Service role for admin operations

### Authentication
- Supabase Auth with JWT tokens
- Secure token refresh rotation
- Password requirements enforced

### Storage Security
- Private buckets with access policies
- User-specific folder structure
- File size limits enforced

## 🚀 Deployment

### Environment Setup

1. **Development**: Local Supabase instance
2. **Staging**: Supabase cloud staging project
3. **Production**: Supabase cloud production project

### Deployment Process

1. **Database Migration**
   ```bash
   npm run deploy:staging migrate
   ```

2. **Function Deployment**
   ```bash
   npm run deploy:staging functions
   ```

3. **Full Deployment**
   ```bash
   npm run deploy:production deploy
   ```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write meaningful commit messages
- Add JSDoc comments for functions
- Update README for significant changes

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support, email support@commutiq.com or create an issue on GitHub.

## 🗺️ Roadmap

### Phase 1: Core App (Current)
- ✅ Database schema and authentication
- ✅ Basic React Native setup
- 🔄 Onboarding flow
- 🔄 Course display and audio playback

### Phase 2: AI Integration
- AI-powered content generation
- Text-to-speech integration
- Intelligent course recommendations

### Phase 3: Advanced Features
- Social features and sharing
- Offline mode improvements
- Advanced analytics dashboard
- Premium subscription features

### Phase 4: Scale & Optimize
- Performance optimizations
- Multi-language support
- Advanced personalization
- Enterprise features

---

**Built with ❤️ by the CommutIQ Team**
