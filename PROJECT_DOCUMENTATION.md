# MIT-ADT AI Voice Platform (AlphaAI) - Comprehensive Documentation

## Table of Contents
- [Project Overview](#project-overview)
- [Architecture Stack](#architecture-stack)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Key Concepts](#key-concepts)
- [Authentication System](#authentication-system)
- [API Integration](#api-integration)
- [Database & Supabase](#database--supabase)
- [UI Components & Design System](#ui-components--design-system)
- [Routing System](#routing-system)
- [State Management](#state-management)
- [Error Handling](#error-handling)
- [PWA Features](#pwa-features)
- [Build & Deployment](#build--deployment)
- [Configuration](#configuration)
- [Environment Variables](#environment-variables)
- [Development Workflow](#development-workflow)
- [Security Considerations](#security-considerations)
- [Performance & Optimization](#performance--optimization)
- [Testing](#testing)
- [Code Style & Guidelines](#code-style--guidelines)
- [Troubleshooting](#troubleshooting)

---

## Project Overview

MIT-ADT AI Voice Platform (marketed as "AlphaAI") is a white-label PWA (Progressive Web Application) dashboard for managing voice AI campaigns. Built with modern web technologies, it provides a user-friendly interface for monitoring and controlling voice-based AI campaigns.

**Key Features:**
- Real-time campaign monitoring and management
- Call analytics and lead tracking
- Agent workflow management
- Transcript viewing and recording playback
- PWA for mobile and desktop installation
- Secure authentication with session management

**White-Label Branding:**
- App Name: "MIT-ADT AI Voice Platform"
- Short Name: "AlphaAI"
- Client Name: "MIT ADT University"
- Custom design tokens and branding

---

## Architecture Stack

### Frontend Architecture
- **Framework**: TanStack Start (Vite + React 19)
- **Routing**: TanStack Router with file-based routing
- **UI Library**: Custom components with Radix UI primitives + Tailwind CSS
- **State Management**: TanStack Query for server state + React local state
- **Form Handling**: React Hook Form + Zod validation

### Backend Architecture
- **Server Functions**: TanStack Start server functions (proxied through Vercel)
- **API Proxy**: Server functions act as a proxy to AlphaAI backend
- **Authentication**: Custom session-based auth with TanStack Start
- **Database**: Supabase for user management and audit logging

### Deployment
- **Platform**: Vercel (serverless)
- **Build Tool**: Vite + Nitro
- **PWA Service Worker**: Built-in support
- **Environment**: Cloudflare Workers-compatible

---

## Technology Stack

### Core Dependencies
```json
{
  "react": "^19.2.0",
  "react-dom": "^19.2.0",
  "@tanstack/react-router": "^1.168.25",
  "@tanstack/react-start": "^1.167.50",
  "@tanstack/react-query": "^5.83.0",
  "@tailwindcss/vite": "^4.2.1",
  "@tailwindcss": "^4.2.1"
}
```

### UI Components
- **Radix UI**: Headless UI primitives for accessibility
- **Lucide React**: Icon library
- **Tailwind CSS v4**: Utility-first styling with custom design tokens
- **Shadcn/ui**: Component library (customized for MIT-ADT theme)

### Form & Validation
- **React Hook Form**: Performance-optimized forms
- **Zod**: Schema validation and type inference

### Data Fetching & Caching
- **TanStack Query**: Server state management with caching
- **Custom Server Functions**: Type-safe API calls to AlphaAI backend

### Additional Tools
- **ESLint**: Code linting with React rules
- **Prettier**: Code formatting
- **TypeScript**: Full type safety
- **Vite**: Fast build tool and dev server

---

## Project Structure

```
src/
├── components/              # UI Components
│   ├── layout/           # Layout components
│   │   ├── Sidebar.tsx   # Navigation sidebar
│   │   └── TopBar.tsx    # Top navigation bar
│   ├── leads/            # Business logic components
│   │   └── LeadsTable.tsx # Leads table with dynamic columns
│   └── ui/               # Reusable UI components (Shadcn/ui)
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       └── ... (30+ components)
├── config/               # Configuration files
│   └── dashboard.config.ts # Dashboard operational settings
├── integrations/         # Third-party integrations
│   └── supabase/         # Supabase setup and types
│       ├── auth-attacher.ts
│       ├── auth-middleware.ts
│       ├── client.ts
│       ├── client.server.ts
│       └── types.ts
├── lib/                  # Core libraries and utilities
│   ├── alphaai.server.ts     # AlphaAI API client (server-only)
│   ├── alphaai.functions.ts  # Server functions for AlphaAI API
│   ├── auth.functions.ts    # Authentication handlers
│   ├── session.server.ts    # Session management
│   ├── utils.ts             # Utility functions (cn, etc.)
│   ├── utils-format.ts      # Formatting utilities (date, currency)
│   ├── error-capture.ts     # Global error capture
│   ├── error-page.ts        # Error page rendering
│   └── config.server.ts     # Server configuration
├── types/                # TypeScript type definitions
│   └── alphaai.ts          # AlphaAI API types
├── routes/               # File-based routing
│   ├── __root.tsx         # Root route with layout
│   ├── index.tsx          # Home route (redirects to /dashboard)
│   ├── login.tsx          # Login page
│   └── _authenticated/    # Protected routes wrapper
│       ├── dashboard.tsx   # Dashboard layout
│       ├── index.tsx      # Dashboard overview
│       ├── campaigns/     # Campaign management
│       │   ├── index.tsx     # Campaign list
│       │   ├── $id.tsx      # Campaign detail
│       │   └── create.tsx   # Create campaign
│       ├── calls/         # Call analytics
│       │   ├── index.tsx     # Calls list
│       │   └── $runId.tsx   # Call detail
│       └── agents/        # Agent management
│           └── index.tsx     # Agent list
├── hooks/                # Custom React hooks
│   └── use-mobile.tsx    # Mobile detection hook
├── router.tsx            # Router configuration
├── start.ts              # TanStack Start configuration
├── server.ts             # Server entry point with error handling
└── routeTree.gen.ts      # Generated route tree
```

---

## Key Concepts

### 1. Server Functions
Type-safe server functions that act as a proxy to the AlphaAI API:
- Never expose API keys to the client
- Handle authentication and authorization
- Transform data between API and UI expectations
- Use Zod for input validation

### 2. Type Safety
- Full TypeScript implementation
- End-to-end type inference from API to UI
- Zod schemas for runtime validation
- Strict null checks and error handling

### 3. Authentication Flow
1. User submits credentials to `/login`
2. Server verifies against `DASHBOARD_USERNAME`/`DASHBOARD_PASSWORD`
3. Session created with TanStack Start's session management
4. Protected routes check session before rendering
5. JWT tokens handled for Supabase auth

### 4. API Proxy Pattern
All AlphaAI API calls go through server functions:
```typescript
// Client code (never sees API key)
const data = await getCampaigns();

// Server-side (alphaAIFetch with Bearer token)
const { base, key } = getConfig();
headers: { Authorization: `Bearer ${key}` }
```

---

## Authentication System

### Session Management
- **Library**: TanStack Start's `useSession`
- **Storage**: Secure, HTTP-only cookies
- **Duration**: 7 days (configurable)
- **Security**: SameSite='lax', Secure flag enabled

### Protected Routes
Routes wrapped in `_authenticated.tsx`:
- Check for valid session before rendering
- Redirect to `/login` if unauthenticated
- Pass user data to child components

### Supabase Integration
- **Client-Side**: Standard Supabase client for user management
- **Server-Side**: Service role key for admin operations
- **Auth Middleware**: Attaches JWT to server function calls

---

## API Integration

### AlphaAI API Client (`alphaai.server.ts`)
- **Base URL**: Configurable via `ALPHAAI_API_BASE_URL`
- **Authentication**: Bearer token from `ALPHAAI_API_KEY`
- **Error Handling**: Custom `AlphaAIError` with status codes
- **Request/Response**: JSON with automatic parsing

### Server Functions
Each server function:
1. Validates input with Zod
2. Requires authentication via `requireUser()`
3. Calls `alphaAIFetch` with appropriate endpoint
4. Transforms response for UI consumption
5. Handles errors gracefully

### Data Transformation
- Campaign `state` → `status` (API uses different field names)
- Wraps responses in standardized format
- Handles pagination and filtering
- Caches data with TanStack Query

---

## Database & Supabase

### Database Schema
```typescript
// Supabase tables (auto-generated types)
- profiles: User profile information
- user_roles: Role-based access control
- audit_log: Security audit trail
- cached_campaigns: Campaign data cache
- cached_calls: Call data cache
```

### Data Caching Strategy
- **Cached Campaigns**: Campaign state stored in Supabase
- **Cached Calls**: Call data with `dograh_id` reference
- **Auto-refresh**: Polled every 30 seconds for progress
- **Sync**: Server functions fetch fresh data on demand

### Security
- **Row Level Security (RLS)**: Enabled on all tables
- **Service Role**: Admin operations bypass RLS
- **Audit Logging**: All actions logged with user context

---

## UI Components & Design System

### Design Tokens
Custom MIT-ADT theme in `src/styles.css`:
- Primary: Purple (`#3d1165`, `#602794`)
- Secondary: Orange (`#dd4c1a`)
- Background: Grayscale with custom named colors
- Spacing: Consistent padding/margin system

### Component Architecture
- **Layout Components**: Sidebar, TopBar, MobileBottomNav
- **Business Components**: LeadsTable, StatusBadge, StatCard
- **Reusable UI**: 30+ Shadcn/ui components
- **Form Components**: Wrapped with React Hook Form

### Responsive Design
- Mobile-first approach
- Responsive sidebar (collapsible on mobile)
- Touch-friendly interactions
- PWA-optimized for mobile installation

---

## Routing System

### File-Based Routing
Routes defined in `src/routes/`:
- `index.tsx`: Home → redirects to `/dashboard`
- `login.tsx`: Public login page
- `_authenticated/`: Protected routes wrapper
- Dynamic routes: `$id.tsx`, `$runId.tsx`

### Route Guards
- `_authenticated.tsx`: Checks session before rendering children
- `beforeLoad`: Route-level authentication checks
- `component`: Route-specific error boundaries

### Navigation
- **Sidebar**: Main navigation with icons
- **TopBar**: Page title and user menu
- **Mobile Bottom Nav**: Touch-friendly navigation

---

## State Management

### TanStack Query
- **Caching**: Automatic data caching with TTL
- **Polling**: Real-time updates (campaign progress every 30s)
- **Optimistic Updates**: UI updates before server response
- **Error Handling**: Retry and error states

### Local State
- **React State**: Component-level state (form inputs, UI state)
- **Context**: Router and query client context
- **Session**: TanStack Start session management

### Data Flow
1. User action triggers server function
2. Server function calls AlphaAI API
3. Response updates TanStack Query cache
4. UI re-renders with fresh data
5. Loading/error states managed automatically

---

## Error Handling

### Global Error Capture
- **Window Error Handler**: Captures unhandled errors
- **Promise Rejection Handler**: Captures async errors
- **Error Reporting**: Integrated with Lovable error reporting

### Server Error Handling
- **Try/Catch**: Wrapped around all server functions
- **Error Boundaries**: React error boundaries at route level
- **SSR Errors**: Special handling for h3 swallowed errors
- **User-Friendly Messages**: Graceful degradation

### Error Display
- **ErrorAlert**: Consistent error message component
- **Toast Notifications**: Sonner for ephemeral errors
- **Error Page**: Custom 500 error page

---

## PWA Features

### Manifest (`public/manifest.webmanifest`)
```json
{
  "name": "MIT-ADT AI Voice Platform",
  "short_name": "AlphaAI",
  "scope": "/",
  "display": "standalone",
  "background_color": "#3d1165",
  "theme_color": "#602794"
}
```

### PWA Capabilities
- **Installable**: Add to home screen on mobile
- **Offline**: Basic offline support with service worker
- **Fast**: Optimized for mobile networks
- **App-like**: Native app experience

### Service Worker
Built-in service worker for:
- Caching static assets
- Offline functionality
- Push notifications (future)

---

## Build & Deployment

### Build Process
```bash
npm run build    # Production build
npm run dev      # Development server
npm run preview  # Preview deployment
```

### Build Tools
- **Vite**: Fast build tool with HMR
- **Nitro**: Serverless deployment optimizer
- **TanStack Router**: Route code generation
- **TypeScript**: Type checking and compilation

### Deployment
- **Platform**: Vercel
- **Environment**: Cloudflare Workers
- **Edge Locations**: Global CDN
- **Environment Variables**: Secrets managed in Vercel

---

## Configuration

### Dashboard Configuration (`src/config/dashboard.config.ts`)
Centralized configuration for:
- **Refresh Intervals**: Polling and auto-refresh
- **App Identity**: Names and branding
- **Pagination**: Page sizes and limits
- **Campaign Defaults**: Default values for new campaigns
- **Expected Columns**: Dynamic lead table columns

### Environment Variables
```env
# Server-only secrets
ALPHAAI_API_BASE_URL=https://backend.laveric.com/api/v1
ALPHAAI_API_KEY=jwt_token_here
DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=secure_password
SESSION_SECRET=long_random_string_32+

# Public (client-safe)
VITE_APP_NAME="MIT-ADT AI Voice Platform"
VITE_CLIENT_NAME="MIT ADT University"
VITE_REFRESH_INTERVAL_MS=600000

# Supabase
SUPABASE_URL=project_url
SUPABASE_PUBLISHABLE_KEY=public_key
```

---

## Environment Variables

### Required Variables
- `ALPHAAI_API_BASE_URL`: Backend API endpoint
- `ALPHAAI_API_KEY`: JWT for AlphaAI API
- `DASHBOARD_USERNAME`: Admin username
- `DASHBOARD_PASSWORD`: Admin password
- `SESSION_SECRET`: ≥32 chars for session encryption

### Optional Variables
- `VITE_APP_NAME`: Application name
- `VITE_CLIENT_NAME`: Client organization name
- `VITE_REFRESH_INTERVAL_MS`: Auto-refresh interval

### Supabase Variables
- `SUPABASE_URL`: Project URL
- `SUPABASE_PUBLISHABLE_KEY`: Public API key
- `SUPABASE_SERVICE_ROLE_KEY`: Admin API key

---

## Development Workflow

### Setup
1. Clone repository
2. Install dependencies: `npm install`
3. Copy `.env` template and configure
4. Run dev server: `npm run dev`

### Development Features
- **Hot Module Replacement**: Instant updates
- **Type Checking**: Real-time TypeScript errors
- **ESLint**: Code linting
- **Prettier**: Auto-formatting

### Code Generation
- **Route Tree**: Auto-generated by TanStack Router
- **Type Safety**: Full TypeScript inference
- **Component Tags**: Automatic component tagging

---

## Security Considerations

### Authentication Security
- **Session Cookies**: HTTP-only, SameSite='lax', Secure
- **Password Storage**: Environment variables only
- **Session Expiry**: 7-day timeout
- **JWT Handling**: Server-side only for AlphaAI API

### API Security
- **Proxy Pattern**: Client never touches API directly
- **Input Validation**: Zod schemas for all inputs
- **Error Messages**: Generic on client, detailed on server
- **HTTPS**: All API calls over HTTPS

### Data Protection
- **PII**: No Personally Identifiable Information stored
- **Audit Logs**: All actions logged
- **RBAC**: Role-based access control (admin/viewer)

---

## Performance & Optimization

### Performance Features
- **Code Splitting**: Route-based splitting
- **Caching**: TanStack Query caching with TTL
- **Lazy Loading**: Components loaded on demand
- **Virtual Scrolling**: For large tables

### Optimization Techniques
- **Memoization**: React memo for expensive components
- **Debouncing**: Search inputs debounced
- **Prefetching**: Route prefetching on hover
- **Image Optimization**: Optimized with Vite

### Bundle Analysis
- **Small Bundle**: ~500KB total (uncompressed)
- **Tree Shaking**: Unused code eliminated
- **Compression**: Brotli compression on Vercel

---

## Testing

### Testing Strategy
- **Unit Tests**: Not implemented (future enhancement)
- **Integration Tests**: E2E testing (future enhancement)
- **Manual Testing**: Comprehensive manual testing
- **Browser Testing**: Chrome, Firefox, Safari, Mobile

### Development Testing
- **Type Checking**: TypeScript compiler
- **Linting**: ESLint for code quality
- **Prettier**: Code formatting
- **Build Verification**: Build process validates types

---

## Code Style & Guidelines

### TypeScript Guidelines
- Strict mode enabled
- No implicit any
- Explicit return types
- Interface over type for objects

### React Patterns
- Functional components with hooks
- No class components
- Custom hooks for reusable logic
- PropTypes replaced with TypeScript

### File Organization
- File-based routing
- Component files in `src/components/`
- Utility functions in `src/lib/`
- Types in `src/types/`

---

## Troubleshooting

### Common Issues

#### Build Failures
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Authentication Issues
- Check `SESSION_SECRET` length (≥32 chars)
- Verify `DASHBOARD_USERNAME`/`DASHBOARD_PASSWORD`
- Clear browser cookies

#### API Issues
- Verify `ALPHAAI_API_BASE_URL` and `ALPHAAI_API_KEY`
- Check network connectivity
- Review server logs in Vercel dashboard

#### PWA Issues
- Check manifest.json validity
- Verify service worker registration
- Test on HTTPS (required for PWA)

### Debug Tools
- **React DevTools**: Component inspection
- **Network Tab**: API call inspection
- **Console Errors**: JavaScript errors
- **Vercel Logs**: Server logs

---

## Future Enhancements

### Planned Features
- [ ] Unit tests with Jest/Vitest
- [ ] E2E tests with Playwright
- [ ] Dark mode support
- [ ] Multi-language support
- [ ] Advanced analytics
- [ ] Real-time notifications
- [ ] Bulk operations

### Technical Debt
- [ ] Add error boundaries to all routes
- [ ] Implement proper loading states
- [ ] Add accessibility improvements
- [ ] Optimize bundle size further
- [ ] Add API response caching

---

## Conclusion

This documentation covers all aspects of the MIT-ADT AI Voice Platform (AlphaAI) project. It's a modern, secure, and performant web application built with cutting-edge technologies. The architecture prioritizes type safety, security, and user experience while maintaining flexibility for future enhancements.

For additional questions or clarification, refer to the source code or consult the development team.