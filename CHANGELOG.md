# Changelog

All notable changes to Agentbase will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## Phase 6 — Enterprise Features

### Added
- **Teams & Organizations**
  - Team creation with name, slug, description
  - Member management with role hierarchy (Owner > Admin > Member > Viewer)
  - Invitation system with email-based member invites
  - Role-based permission guards for team operations
  - Team settings: default AI provider, shared API keys, member invite permissions
  - Full CRUD API: `POST /api/teams`, `GET /api/teams`, team members endpoints

- **Knowledge Base (RAG)**
  - Vector-based semantic search using OpenAI embeddings
  - Document ingestion pipeline with configurable chunking (size, overlap)
  - Support for text files (.txt, .md, .json, .csv, .html, .xml)
  - Cosine similarity search with relevance scoring
  - Context builder for RAG-enhanced AI prompts
  - Document status tracking (processing → ready | error)
  - MongoDB collections: knowledge_bases, knowledge_documents, knowledge_chunks

- **In-App Notifications**
  - Real-time notification bell component with unread count badge
  - Notification center with filtering by category (billing, team, knowledge, webhook)
  - 30-second polling for updates
  - Notification types: info, success, warning, error
  - Action URLs for click-through navigation
  - Global module with convenience helpers for other services

- **Custom Domains**
  - DNS verification via CNAME or TXT records
  - SSL certificate tracking and expiration monitoring
  - Domain settings: redirect-www, force-HTTPS, custom headers
  - Reserved domain protection
  - Auto-detection of verification method with retry attempts
  - Full management UI with DNS setup instructions

- **White-Label Branding**
  - Comprehensive color scheme customization (primary, secondary, accent, background, text)
  - Typography customization (body font, heading font)
  - Widget appearance: position, border radius, welcome message, placeholder
  - Email branding: from name, reply-to, header logo, footer text
  - Custom CSS injection (5KB limit) with platform CSS variable system
  - "Powered by Agentbase" visibility toggle
  - CSS variables API for dynamic theming

- **SSO (SAML/OIDC)**
  - SAML 2.0 support with SP metadata generation
  - OIDC provider integration with configurable scopes
  - Attribute mapping for email, name, role, groups
  - Auto-provisioning of user accounts on first SSO login
  - Domain restriction for enterprise email requirements
  - SSO enforcement option for team security
  - Login tracking and analytics

- **Data Export & Import**
  - Export formats: JSON (structured) and CSV (tabular)
  - Export resources: all, applications, conversations, analytics
  - Bulk import from JSON with error handling per record
  - CSV generation with automatic JSON flattening
  - Security: excludes passwords, API keys, billing data
  - Drag-and-drop import UI with result summary

- **System Health Monitoring**
  - Real-time health checks for PostgreSQL, MongoDB, Redis, AI Service
  - Service latency measurement and error tracking
  - OS-level metrics: memory, CPU cores, load averages
  - Process metrics: RSS memory, uptime, PID
  - Platform statistics: users, applications, subscriptions, plan breakdown
  - Auto-refresh dashboard (15-second interval)
  - Overall system status indicators (healthy/degraded/down)

### Changed
- Dashboard navigation expanded with Branding, Domains, Export/Import sections
- Admin navigation added System Health monitoring
- Team management page with member role controls
- Knowledge base page with three-tab interface (Documents, Search, Settings)

## Phase 5 — Production Deployment

### Added
- **Docker Production Deployment**
  - Multi-stage Dockerfiles for Core API, Frontend, AI Service
  - Alpine/slim base images for minimal footprint
  - Non-root user (`agentbase`) for security
  - `tini` init process for proper signal handling
  - Health checks on all containers
  - `docker-compose.prod.yml` with full production stack

- **Nginx Reverse Proxy**
  - SSL/TLS termination (TLS 1.2/1.3)
  - HTTP → HTTPS redirect with ACME challenge passthrough
  - Security headers: HSTS, X-Frame-Options, X-Content-Type-Options, CSP, Permissions-Policy
  - Rate limiting zones: API (30 req/s), Auth (5 req/s), Webhooks (10 req/s)
  - SSE streaming support for AI service
  - CORS headers for public API/widget endpoints
  - Static asset caching with immutable Cache-Control

- **Security Hardening**
  - Helmet middleware for HTTP security headers
  - Production-safe CORS with configurable allowed origins
  - `trust proxy` enabled for correct IP detection
  - Raw body parsing for Stripe webhook signature verification
  - Swagger docs auto-disabled in production
  - Graceful shutdown hooks for clean container stops

- **Email Service**
  - Global NestJS module with SMTP transport via nodemailer
  - Dev mode: console logging when SMTP not configured
  - Email templates: welcome, password reset, usage warnings, subscription changes
  - HTML emails with inline styles and CTA buttons

- **File Upload Service**
  - S3-compatible storage (AWS S3, MinIO, DigitalOcean Spaces, Cloudflare R2)
  - Local filesystem fallback mode
  - File type validation: images, JSON, ZIP, text, markdown
  - 10MB file size limit
  - Random hex filenames for collision prevention

- **Audit Logging**
  - MongoDB-backed audit trail for platform actions
  - Tracked events: auth, CRUD operations, API key lifecycle, plugin installs, webhook events
  - Queryable with filters: action, resource, user, date range
  - Personal activity summary and security events (admin only)
  - Indexed for performance: userId+timestamp, action+timestamp, resource+resourceId
  - Frontend audit page with filterable event log and activity summary cards

- **Deploy Scripts**
  - `setup.sh`: First-time server provisioning with auto-generated secrets
  - `backup.sh`: Automated PostgreSQL and MongoDB backups with 7-day retention
  - `ssl-setup.sh`: Let's Encrypt integration with certbot and auto-renewal

### Changed
- `next.config.js` updated with `output: 'standalone'` for Docker
- Added `.dockerignore` for optimized build context
- Request logger middleware with HTTP logging and log level by status code
- Dashboard navigation added Audit Log to admin section

## Phase 4 — Hosted SaaS Platform

### Added
- **Stripe Billing Integration**
  - 4 subscription tiers: Free ($0), Starter ($29/mo), Pro ($99/mo), Enterprise ($499/mo)
  - Stripe Checkout session creation for plan upgrades
  - Stripe Customer Portal for billing management
  - Webhook endpoint for payment events
  - Dev mode: simulate checkout without Stripe keys
  - Subscription lifecycle handling: checkout completed, updated, deleted, payment failed

- **Usage Metering & Quotas**
  - Token and message counters tracked per billing cycle
  - `trackUsage()` returns allowed status and remaining quota
  - Usage enforcement before AI calls
  - Color-coded progress bars (green/amber/red) in dashboard
  - Usage reset at billing cycle renewal

- **Subscription Entity**
  - PostgreSQL table with Stripe integration fields
  - Plan tier enum: free, starter, pro, enterprise
  - Status enum: active, past_due, canceled, trialing, incomplete
  - Per-plan limits: tokens, apps, messages, API keys
  - Usage counters and billing period tracking

- **Webhook System**
  - 11 event types: message events, conversation events, app events, plugin events, API key events, usage limits, subscription changes
  - HMAC-SHA256 signing secret for payload verification
  - Delivery tracking: total deliveries, failed deliveries, last error
  - 10-second timeout per delivery with error capture
  - Test ping functionality
  - Enable/disable toggle per webhook

- **Plugin Marketplace (Enhanced)**
  - Search and browse with pagination and sorting (popular/recent/rating)
  - Featured plugins curation
  - 8 plugin categories with icons
  - Rating and review system (1-5 stars + text)
  - One review per user per plugin (upsert behavior)
  - Rating aggregation: average, total reviews, star distribution
  - MongoDB-backed reviews with user name and plugin version

### Changed
- Frontend billing dashboard with plan comparison, usage meters, Stripe integration
- Webhook management UI with event multi-selector and signing secret display
- Enhanced marketplace with category filtering, search, featured section
- Plugin detail view with rating distribution and review submission
- Dashboard navigation added Marketplace, Billing, Webhooks

## Phase 3 — Self-Hosted & Extensibility

### Added
- **Embeddable Chat Widget**
  - Standalone JavaScript (`/public/widget.js`) for any website
  - Configurable via data attributes: app-id, api-key, theme, position, title, greeting, placeholder
  - 4 positions: bottom-right, bottom-left, top-right, top-left
  - Responsive design with mobile breakpoints
  - Session-based conversation persistence
  - Themed via CSS custom properties from Theme Engine
  - "Powered by Agentbase" branding

- **Public API with API Key Authentication**
  - `POST /api/v1/chat` — Send messages via API key (X-API-Key header)
  - `GET /api/v1/app` — Get application config for scoped API key
  - `GET /api/v1/app/:slug` — Lookup application by slug
  - `GET /api/v1/conversations/:id` — Retrieve conversation history
  - API Key Guard with SHA-256 hash validation
  - Rate Limiting Interceptor with per-key limits and X-RateLimit-* headers

- **API Key Management**
  - Create, list, revoke, delete API keys
  - Keys scoped to specific applications or all apps
  - Configurable rate limits (10-10,000 req/min)
  - Usage tracking: last used timestamp, total request count
  - Raw key returned once only on creation
  - Frontend component with rate limit slider and copy-to-clipboard

- **Analytics Module**
  - Aggregated stats: conversations, messages, tokens, costs
  - Raw event stream with MongoDB storage
  - Event types: message_sent, message_received, conversation_started, widget_loaded, api_call, error
  - Daily activity bar chart
  - Provider breakdown (OpenAI vs Anthropic usage)
  - Source breakdown (dashboard vs widget vs API)
  - Estimated cost calculation based on token usage

- **Theme Engine**
  - CSS custom property generation from theme definitions
  - 4 built-in presets: Default (indigo), Dark (slate), Minimal (neutral), Vibrant (pink)
  - Theme merging: partial overrides on any base theme
  - Theme validation for required fields
  - Properties: colors (14), typography (4), layout (5), plus custom vars
  - Widget styles driven by `--ab-*` CSS variables

- **Embed Code Generator**
  - Visual configuration UI for chat widget
  - Theme picker with color swatches
  - Position selector, title, greeting, placeholder customization
  - Live preview panel
  - Auto-generated `<script>` tag with configured attributes
  - Copy-to-clipboard for embed code
  - REST API curl example

- **Admin Panel**
  - Platform-wide statistics: users, apps, plugins
  - User management: list all users, change roles, enable/disable accounts
  - Role-gated: visible only to admin users
  - Overview tab with platform stats cards
  - Users tab with role dropdown and status toggle

### Changed
- Dashboard navigation added Analytics page
- Admin Panel conditionally shown for admin role users
- Application detail page expanded to 7 tabs: Chat, Configuration, Plugins, Prompts, Deploy, Analytics, History
- Settings page split into 4 sections: Profile, Security, API Keys, AI Providers

## Phase 2 — MVP Core Platform

### Added
- **OAuth2 Authentication**
  - GitHub OAuth with automatic account linking
  - Google OAuth with automatic account linking
  - Provider discovery endpoint listing enabled OAuth providers
  - Frontend OAuth callback page with token exchange
  - Dynamic OAuth button display on login page

- **Streaming AI Responses (SSE)**
  - Server-Sent Events streaming endpoint
  - Frontend StreamingChat component with real-time token-by-token display
  - Abort/stop button to cancel in-progress streams
  - Toggle between streaming and standard request modes

- **Prompt Template Management**
  - Create, read, update, delete prompt templates
  - `{{variable}}` syntax for dynamic substitution
  - Server-side variable rendering
  - Set default prompt per application
  - Frontend component with CRUD, live preview, variable detection

- **Plugin Manager (per-app)**
  - Install/uninstall plugins from marketplace to individual apps
  - Activate/deactivate installed plugins
  - Visual marketplace browser with ratings and download counts
  - Tabbed UI (Installed vs Marketplace) within app detail

- **Conversation History**
  - List conversations per application
  - Archive conversations
  - Frontend history tab in app detail with delete capability

- **Settings Page**
  - Profile: Edit display name, avatar URL
  - Security: Change password
  - API Keys: Local storage for development keys

### Changed
- Dashboard with real-time stats pulled from API
- Quick action cards linking to key sections
- Recent applications list with live status indicators
- API client with automatic token refresh, retry on 401
- Streaming methods with SSE parsing and abort control

## Phase 1 — Foundation

### Added
- **Monorepo Structure**
  - NestJS core API (`/packages/core`)
  - Next.js 14 frontend (`/packages/frontend`)
  - Python FastAPI AI service (`/packages/ai-service`)
  - Shared TypeScript types (`/packages/shared`)
  - Plugin SDK (`/packages/plugins`)
  - Theme system (`/packages/themes`)
  - pnpm workspace configuration

- **Authentication & Authorization**
  - JWT token generation and validation
  - User registration and login
  - Password reset flow (request + reset endpoints)
  - Password hashing with bcrypt
  - Role-based access control (Admin, Developer, User)
  - JWT authentication guard
  - Role-based guards

- **Core Entities**
  - Users: PostgreSQL with TypeORM
  - Applications: CRUD with owner association
  - Plugins: Marketplace listing and metadata
  - Themes: Theme registry with manifest storage
  - Subscriptions: Billing entity with plan tiers

- **Plugin System**
  - WordPress-style hook engine (actions + filters)
  - Plugin lifecycle management (install, activate, deactivate, uninstall)
  - Plugin SDK with TypeScript interfaces
  - Hook registry with priority-based execution
  - Example plugins: Hello World, Simple AI Chat
  - Plugin dependency resolution

- **AI Integration**
  - Multi-provider abstraction layer
  - OpenAI integration (GPT-4, GPT-4o, GPT-3.5 Turbo)
  - Anthropic integration (Claude Sonnet 4.5, Claude Haiku 4.5)
  - Google Gemini integration (Gemini 2.0 Flash, 1.5 Pro, 1.5 Flash)
  - Conversation management (create, continue, retrieve)
  - MongoDB storage for conversations
  - Rate limiting per user/organization

- **Development Environment**
  - Docker Compose for local databases (PostgreSQL 16, MongoDB 7, Redis 7)
  - `.env.example` with all required environment variables
  - VS Code workspace configuration
  - Development scripts: `pnpm dev`, `pnpm dev:core`, `pnpm dev:frontend`, `pnpm dev:ai`

- **Documentation**
  - Comprehensive README with architecture diagram
  - CONTRIBUTING.md with development guidelines
  - API endpoint documentation
  - Quick start guide
  - GPL-3.0 license

### Technical Details
- **Backend**: NestJS + TypeORM (PostgreSQL) + Mongoose (MongoDB)
- **Frontend**: Next.js 14 (App Router) + React + Tailwind CSS
- **AI Service**: FastAPI + OpenAI SDK + Anthropic SDK + Google Generative AI SDK
- **Databases**: PostgreSQL 16 (relational), MongoDB 7 (documents), Redis 7 (cache)
- **Monorepo**: pnpm workspaces
- **Containerization**: Docker with multi-stage builds

[Unreleased]: https://github.com/agentaflow/agentbase/compare/v0.1.0...HEAD
