# Agentbase

**WordPress for AI Applications** — Build, deploy, and manage AI-powered applications without the complexity.

Agentbase is an open-source platform that brings the WordPress model to AI development: plugins, themes, a marketplace, and a hosted option — everything you need to launch AI products fast.

## Architecture

```
agentbase/
├── packages/
│   ├── core/              # NestJS API (PostgreSQL + MongoDB)
│   ├── frontend/          # Next.js 14 (App Router + Tailwind)
│   ├── ai-service/        # FastAPI (AI provider integrations + SSE streaming)
│   ├── shared/            # Shared TypeScript types
│   ├── plugins/           # Plugin SDK + examples
│   └── themes/            # Theme SDK + starter themes
├── docker-compose.yml     # Local dev databases
└── .env.example           # Environment template
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Core API** | Node.js + NestJS + TypeORM |
| **Frontend** | Next.js 14 + React + Tailwind CSS |
| **AI Service** | Python + FastAPI |
| **SQL Database** | PostgreSQL 16 |
| **Document DB** | MongoDB 7 |
| **Cache** | Redis 7 |
| **License** | GPL-3.0 |

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3.11+
- Docker & Docker Compose
- pnpm 9+

### Setup

```bash
# Clone the repo
git clone https://github.com/agentaflow/agentbase.git
cd agentbase

# Copy environment variables
cp .env.example .env

# Start databases
docker compose up -d

# Install dependencies
pnpm install

# Start all services
pnpm dev
```

Services will be available at:
- **Frontend**: http://localhost:3000
- **Core API**: http://localhost:3001
- **API Docs**: http://localhost:3001/api/docs
- **AI Service**: http://localhost:8000

### Start Individual Services

```bash
pnpm dev:core       # NestJS API only
pnpm dev:frontend   # Next.js frontend only
pnpm dev:ai         # FastAPI AI service only
```

## API Endpoints

### Authentication
- `POST /api/auth/register` — Register new user
- `POST /api/auth/login` — Login
- `GET /api/auth/me` — Get current user
- `GET /api/auth/github` — OAuth: Redirect to GitHub
- `GET /api/auth/github/callback` — OAuth: GitHub callback
- `GET /api/auth/google` — OAuth: Redirect to Google
- `GET /api/auth/google/callback` — OAuth: Google callback
- `GET /api/auth/providers` — List available OAuth providers
- `POST /api/auth/change-password` — Change password
- `POST /api/auth/password-reset/request` — Request password reset

### Applications
- `POST /api/applications` — Create application
- `GET /api/applications` — List user's applications
- `GET /api/applications/:id` — Get application
- `PUT /api/applications/:id` — Update application
- `DELETE /api/applications/:id` — Delete application

### Plugins
- `GET /api/plugins` — List marketplace plugins
- `POST /api/plugins` — Create plugin
- `PUT /api/plugins/:id/publish` — Publish plugin
- `POST /api/applications/:appId/plugins` — Install plugin
- `PUT /api/applications/:appId/plugins/:id/activate` — Activate plugin
- `PUT /api/applications/:appId/plugins/:id/deactivate` — Deactivate plugin
- `DELETE /api/applications/:appId/plugins/:id` — Uninstall plugin

### Prompt Templates
- `POST /api/prompts` — Create prompt template
- `GET /api/prompts?applicationId=` — List templates for app
- `GET /api/prompts/:id` — Get prompt template
- `PUT /api/prompts/:id` — Update prompt template
- `DELETE /api/prompts/:id` — Delete prompt template
- `PUT /api/prompts/:id/default` — Set as default template
- `POST /api/prompts/render` — Render template with variables

### Themes
- `GET /api/themes` — List themes
- `POST /api/themes` — Create theme

### AI Service
- `GET /api/ai/providers` — List AI providers
- `POST /api/ai/conversations` — Create conversation
- `POST /api/ai/conversations/:id/messages` — Send message (standard)
- `POST /api/ai/conversations/:id/stream` — Send message (SSE streaming)
- `GET /api/ai/conversations/by-app/:appId` — List conversations
- `DELETE /api/ai/conversations/:id` — Archive conversation

## AI Providers

Agentbase supports multiple AI providers out of the box:

- **OpenAI** — GPT-4, GPT-4o, GPT-3.5 Turbo
- **Anthropic** — Claude Sonnet 4.5, Claude Haiku 4.5
- **HuggingFace** — Coming soon

Set your API keys in `.env` and Agentbase handles the rest.

## Changelog

### Phase 2 — End-to-End Functionality
- **OAuth2 Authentication** — GitHub and Google OAuth with automatic account linking
- **Streaming AI Responses** — Server-Sent Events (SSE) for real-time token-by-token output
- **Prompt Template Management** — CRUD for reusable prompt templates with `{{variable}}` substitution
- **Plugin Marketplace UI** — Install, activate, deactivate, and uninstall plugins per application
- **Theme Gallery** — Browse themes with color palette preview and live chat mockup
- **Settings Page** — Profile editing, password change, and API key management
- **Conversation Management** — List, archive, and manage conversations per application
- **Enhanced App Detail** — Tabbed interface (Chat, Config, Plugins, Prompts) with streaming chat

### Phase 1 — Foundation
- Monorepo scaffolding with NestJS, Next.js 14, and FastAPI
- JWT authentication with role-based access control
- CRUD for Applications, Plugins, Themes, Users
- WordPress-style hook engine (actions + filters)
- Plugin SDK with lifecycle hooks
- Multi-provider AI abstraction (OpenAI, Anthropic)
- Docker Compose for local databases (PostgreSQL, MongoDB, Redis)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## License

GNU General Public License v3.0 — see [LICENSE](LICENSE)

Built by [AgentaFlow](https://www.agentaflow.com)

---

## Phase 2 Additions

### OAuth2 Authentication
- **GitHub OAuth**: `GET /api/auth/github` initiates flow, callback at `/api/auth/github/callback`
- **Google OAuth**: `GET /api/auth/google` initiates flow, callback at `/api/auth/google/callback`  
- **Provider discovery**: `GET /api/auth/providers` lists enabled OAuth providers
- Frontend OAuth callback page at `/auth/callback` handles token exchange
- Login page dynamically shows OAuth buttons for configured providers

### Streaming AI Responses (SSE)
- `POST /api/ai/conversations/:id/stream` — Server-Sent Events streaming endpoint
- Frontend `StreamingChat` component with real-time token-by-token display
- Abort/stop button to cancel in-progress streams
- Toggle between streaming and standard request modes

### Prompt Template Management
- `POST /api/prompts` — Create template with `{{variable}}` syntax
- `GET /api/prompts?applicationId=X` — List templates per app
- `PUT /api/prompts/:id` — Update template
- `DELETE /api/prompts/:id` — Delete template
- `PUT /api/prompts/:id/default` — Set as default prompt
- `POST /api/prompts/render` — Server-side variable substitution
- Frontend component with CRUD, live preview, and variable detection

### Plugin Manager (per-app)
- Install/uninstall plugins from marketplace to individual apps
- Activate/deactivate installed plugins
- Visual marketplace browser with ratings and download counts
- Tabbed UI (Installed vs Marketplace) within app detail

### Conversation History
- `GET /api/ai/conversations/by-app/:appId` — List conversations per app
- `DELETE /api/ai/conversations/:id` — Archive conversations
- Frontend history tab in app detail with delete capability

### Settings Page (wired to real API)
- **Profile**: Edit display name, avatar URL (PUT /api/users/me)
- **Security**: Change password (POST /api/auth/change-password)
- **API Keys**: Local storage for development keys

### Dashboard Improvements
- Real-time stats pulled from API (app count, active apps, plugins)
- Quick action cards linking to key sections
- Recent applications list with live status indicators

### API Client Enhancements
- Automatic token refresh with retry on 401
- Refresh token storage and management
- `streamMessage()` method with SSE parsing and abort control
- Full prompt template CRUD methods
- Conversation history methods

---

## Phase 3 Additions

### Embeddable Chat Widget
- **`/public/widget.js`** — Standalone JavaScript that can be embedded on any website via a `<script>` tag
- Configurable via data attributes: `data-app-id`, `data-api-key`, `data-theme`, `data-position`, `data-title`, `data-greeting`, `data-placeholder`
- Supports 4 positions (bottom-right, bottom-left, top-right, top-left)
- Responsive design with mobile breakpoint
- Session-based conversation persistence
- Themed via CSS custom properties from the Theme Engine
- "Powered by Agentbase" branding

### Public API with API Key Authentication
- **`POST /api/v1/chat`** — Send messages via API key (X-API-Key header)
- **`GET /api/v1/app`** — Get application config for the scoped API key
- **`GET /api/v1/app/:slug`** — Lookup application by slug
- **`GET /api/v1/conversations/:id`** — Retrieve conversation history
- API Key Guard (`ApiKeyGuard`) validates keys via SHA-256 hash matching
- Rate Limiting Interceptor with per-key limits and `X-RateLimit-*` headers

### API Key Management
- **`POST /api/api-keys`** — Create new API key (raw key returned once only)
- **`GET /api/api-keys`** — List keys for current user (prefix shown, never raw key)
- **`POST /api/api-keys/:id/revoke`** — Disable key without deleting
- **`DELETE /api/api-keys/:id`** — Permanently delete key
- Keys scoped to specific applications or all apps
- Configurable rate limits (10-10,000 req/min)
- Usage tracking: last used timestamp, total request count
- Frontend component with create form, rate limit slider, app scoping, and copy-to-clipboard

### Analytics Module
- **`GET /api/analytics/:appId`** — Aggregated stats (conversations, messages, tokens, costs)
- **`GET /api/analytics/:appId/events`** — Raw event stream
- MongoDB-backed event tracking (message_sent, message_received, conversation_started, widget_loaded, api_call, error)
- Daily activity bar chart
- Provider breakdown (OpenAI vs Anthropic usage)
- Source breakdown (dashboard vs widget vs API)
- Estimated cost calculation based on token usage
- Per-app analytics tab in application detail page
- Global analytics dashboard page with app selector and time range filter

### Theme Engine
- CSS custom property generation from theme definitions
- 4 built-in presets: Default (indigo), Dark (slate), Minimal (neutral), Vibrant (pink)
- Theme merging: partial overrides on any base theme
- Theme validation for required fields
- Properties cover: colors (14), typography (4), layout (5), plus custom vars
- Widget styles driven by `--ab-*` CSS variables

### Embed Code Generator
- Visual configuration UI for the chat widget
- Theme picker with color swatches
- Position selector, title, greeting, placeholder customization
- Live preview panel showing the widget with current settings
- Auto-generated `<script>` tag with all configured attributes
- Copy-to-clipboard for the embed code
- REST API curl example with current API key
- Located in the "Deploy" tab of each application

### Admin Panel
- **`GET /api/admin/stats`** — Platform-wide statistics (users, apps, plugins)
- **`GET /api/admin/users`** — List all users
- **`PUT /api/admin/users/:id/role`** — Change user role
- **`PUT /api/admin/users/:id/status`** — Enable/disable accounts
- Role-gated: only visible to admin users in the sidebar
- Overview tab with platform stats cards
- Users tab with role dropdown, status toggle, and join date

### Dashboard Navigation Updates
- Added Analytics page to sidebar
- Admin Panel conditionally shown for admin role users
- Application detail page now has 7 tabs: Chat, Configuration, Plugins, Prompts, Deploy, Analytics, History
- Settings page split into 4 sections: Profile, Security, API Keys (server-backed), AI Providers (local keys)

---

## Phase 4 Additions

### Stripe Billing Integration
- **`GET /api/billing/plans`** — List all plan tiers with pricing, limits, and features
- **`GET /api/billing/usage`** — Current usage metrics (tokens, messages, apps, API keys)
- **`POST /api/billing/checkout`** — Create Stripe Checkout session for plan upgrade
- **`POST /api/billing/portal`** — Create Stripe Customer Portal session for billing management
- **`POST /api/billing/webhook`** — Stripe webhook endpoint for payment events
- 4 tiers: Free ($0), Starter ($29/mo), Pro ($99/mo), Enterprise ($499/mo)
- Each tier defines limits for tokens, messages, applications, and API keys
- Dev mode: simulates checkout without Stripe keys configured
- Production: full Stripe Checkout + Customer Portal integration
- Handles subscription lifecycle: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`

### Usage Metering & Quotas
- Token and message counters tracked per billing cycle on the Subscription entity
- `trackUsage(userId, tokens)` returns `{ allowed, remaining }` — enforce limits before AI calls
- `getUsage(userId)` returns current usage with percentage bars
- `resetUsage(userId)` resets counters at billing cycle renewal
- Usage meters displayed in the Billing dashboard with color-coded progress bars (green/amber/red)

### Subscription Entity
- PostgreSQL table with Stripe customer ID, subscription ID, price ID
- Plan tier enum: `free | starter | pro | enterprise`
- Status enum: `active | past_due | canceled | trialing | incomplete`
- Per-plan limits: `tokenLimit`, `appLimit`, `messagesLimit`, `apiKeyLimit`
- Usage counters: `tokensUsed`, `messagesUsed`
- Billing period tracking: `currentPeriodStart`, `currentPeriodEnd`

### Webhook System
- **`GET /api/webhooks/events`** — List all available event types
- **`POST /api/webhooks`** — Create webhook with HMAC-SHA256 signing secret (shown once)
- **`GET /api/webhooks`** — List webhooks with delivery stats
- **`PUT /api/webhooks/:id`** — Update webhook URL, events, etc.
- **`DELETE /api/webhooks/:id`** — Delete webhook
- **`POST /api/webhooks/:id/toggle`** — Enable/disable webhook
- **`POST /api/webhooks/:id/test`** — Send a test ping event
- 11 event types: message.sent, message.received, conversation.started, conversation.ended, application.created/updated, plugin.installed/uninstalled, api_key.created, usage.limit_reached, subscription.changed
- Payload verification via `X-Agentbase-Signature` header (HMAC-SHA256)
- Delivery tracking: total deliveries, failed deliveries, last error
- 10-second timeout per delivery with error capture

### Plugin Marketplace (Enhanced)
- **`GET /api/marketplace/browse`** — Search/browse with pagination, sorting (popular/recent/rating)
- **`GET /api/marketplace/featured`** — Curated featured plugins
- **`GET /api/marketplace/categories`** — 8 plugin categories with icons
- **`GET /api/marketplace/plugins/:id`** — Full plugin detail with rating stats and reviews
- **`POST /api/marketplace/plugins/:id/reviews`** — Submit or update a review (1-5 stars + text)
- **`DELETE /api/marketplace/plugins/:id/reviews`** — Delete your review
- Rating aggregation: average rating, total reviews, star distribution (5-1)
- One review per user per plugin (upsert behavior)
- MongoDB-backed reviews with user name, rating, text, plugin version
- Category browsing: Chat, Analytics, Integrations, Security, AI Tools, Productivity, E-Commerce, Content

### Frontend: Billing Dashboard
- Plan comparison grid with feature lists and pricing
- Current plan highlighting with upgrade buttons
- Usage meters with color-coded progress bars (tokens, messages, apps, API keys)
- Stripe Checkout redirect for plan upgrades
- Manage Billing button for Stripe Customer Portal
- Success state after upgrade with plan name display
- Billing period display

### Frontend: Webhook Management
- Create form with name, URL, and event multi-selector (toggle buttons)
- Signing secret displayed once on creation (green banner)
- Webhook list with active/paused status indicators
- Test ping button with success/failure feedback
- Toggle enable/disable, delete actions
- Delivery statistics: total/failed counts, last triggered, last error
- Event tag display per webhook

### Frontend: Enhanced Marketplace
- Category ribbon with icon buttons for quick filtering
- Search with instant filter + sort dropdown (popular/recent/rating)
- Featured plugins section (top 3 cards) on the homepage
- Plugin grid with star ratings, review counts, author, version
- Plugin detail view with full info, rating distribution bar chart
- Review submission form with interactive star picker
- Review list with user name, rating, date, and text
- Back navigation from detail to browse

### Dashboard Navigation Updates
- Added Marketplace, Billing, and Webhooks to sidebar
- Reordered: Overview → Applications → Marketplace → Analytics → Billing → Webhooks → My Plugins → Themes → Settings
- Admin Panel still conditionally shown for admin users

---

## Phase 5 Additions

### Docker Production Deployment
- **Multi-stage Dockerfiles** for Core API, Frontend, and AI Service with:
  - Alpine/slim base images for minimal footprint
  - Non-root user (`agentbase`) for security
  - `tini` init process for proper signal handling
  - Health checks on all containers
  - pnpm workspace-aware builds
- **`docker-compose.prod.yml`** — Full production stack: Postgres 16, MongoDB 7, Redis 7, Core API, AI Service, Frontend, Nginx reverse proxy
  - All database services with health checks and persistent volumes
  - Environment-variable driven configuration
  - Service dependency ordering with health conditions

### Nginx Reverse Proxy
- SSL termination (TLS 1.2/1.3) with configurable certs
- HTTP → HTTPS redirect with ACME challenge passthrough
- Security headers: HSTS, X-Frame-Options, X-Content-Type-Options, CSP, Permissions-Policy
- Rate limiting zones: API (30 req/s), Auth (5 req/s), Webhooks (10 req/s)
- SSE streaming support for AI service (proxy_buffering off)
- CORS headers for Public API / widget endpoints
- Static asset caching with immutable Cache-Control for `/_next/static/`
- Widget.js served with CORS `*` and 1-hour cache
- Upstream keepalive connections for performance

### Security Hardening
- **Helmet middleware** for HTTP security headers
- Production-safe CORS with configurable allowed origins
- Widget requests allowed from any origin (API key auth)
- `trust proxy` enabled for correct IP behind nginx/load balancers
- Raw body parsing enabled for Stripe webhook signature verification
- Swagger docs auto-disabled in production (enable with `ENABLE_SWAGGER=true`)
- Graceful shutdown hooks for clean container stops
- Request validation with implicit type conversion

### Email Service
- **Global NestJS module** available to all other modules
- SMTP transport via `nodemailer` (configurable host/port/auth)
- Dev mode: logs emails to console when no `SMTP_HOST` configured
- Template helpers:
  - `sendWelcome(email, name)` — Account creation welcome
  - `sendPasswordReset(email, token)` — Password reset with tokenized link
  - `sendUsageWarning(email, resource, percent)` — Quota approaching limit
  - `sendSubscriptionChanged(email, plan, action)` — Plan upgrade/downgrade/cancel
- HTML email templates with inline styles and CTA buttons

### File Upload Service
- **S3-compatible storage** with local filesystem fallback
- `POST /api/uploads` — Multipart file upload with folder organization
- S3 support: AWS S3, MinIO, DigitalOcean Spaces, Cloudflare R2
- Local mode: saves to `./uploads/` directory with public URL generation
- File type validation: images (JPEG, PNG, GIF, WebP, SVG), JSON, ZIP, text, markdown
- 10MB file size limit enforced at both multer and service layer
- Random hex filenames prevent collisions and path traversal

### Audit Logging
- **MongoDB-backed** audit trail for all significant platform actions
- `POST /api/audit` — Queryable with filters for action, resource, user, date range
- `GET /api/audit/my-activity` — Personal activity summary (action counts over N days)
- `GET /api/audit/security` — Security-relevant events (admin only)
- Indexed for performance: userId+timestamp, action+timestamp, resource+resourceId
- Tracked fields: userId, userEmail, action, resource, resourceId, details, ipAddress, userAgent, outcome
- Action categories: auth (login/register/password), application CRUD, API key lifecycle, plugin installs, webhook events, subscription changes
- Non-admin users restricted to their own logs; admins see all
- **Frontend audit page** with:
  - Filterable event log table with pagination
  - Color-coded action badges
  - Activity summary cards (action counts with last occurrence)
  - Security events tab (admin only) with IP addresses and outcomes

### Request Logger Middleware
- HTTP request/response logging with method, path, status, duration, IP, user-agent
- Log level based on status code: error for 5xx, warn for 4xx, log for 2xx/3xx

### Deploy Scripts
- **`deploy/scripts/setup.sh`** — First-time server provisioning:
  - Auto-generates `.env` with cryptographically secure random secrets (JWT, database passwords)
  - Self-signed SSL cert generation for development
  - Docker image build and service start
  - Health check verification
- **`deploy/scripts/backup.sh`** — Automated database backups:
  - PostgreSQL `pg_dump` compressed with gzip
  - MongoDB `mongodump` to compressed archive
  - Automatic cleanup of backups older than 7 days
  - Restore instructions printed after each backup
- **`deploy/scripts/ssl-setup.sh`** — Let's Encrypt integration:
  - Certbot webroot verification
  - Certificate copy to nginx SSL directory
  - Auto-renewal cron job template
  - Nginx reload after cert installation

### Infrastructure Files
- **`.dockerignore`** — Optimized Docker build context (excludes node_modules, .git, logs, backups, SSL certs)
- **`next.config.js`** updated with `output: 'standalone'` for Docker, security headers, remote image patterns

### Dashboard Navigation Updates
- Audit Log added to admin sidebar section (alongside Admin Panel)
- Admin section: Admin Panel + Audit Log (visible only to admin users)

---

## Phase 6 Additions

### Teams & Organizations
- **`POST /api/teams`** — Create a new team with name, slug, description
- **`GET /api/teams`** — List teams for current user
- **`GET /api/teams/:id`** — Get team details with members (includes `currentUserRole`)
- **`PUT /api/teams/:id`** — Update team (admin/owner only)
- **`DELETE /api/teams/:id`** — Delete team (owner only, cascading)
- **`GET /api/teams/:id/members`** — List team members with user details
- **`POST /api/teams/:id/members`** — Invite member by email with role
- **`DELETE /api/teams/:id/members/:memberId`** — Remove a member
- **`PUT /api/teams/:id/members/:memberId/role`** — Change member role (owner only)
- Role hierarchy: Owner > Admin > Member > Viewer
- Role-based permission guards: only owners can delete teams or change roles, admins can invite/remove
- Auto-generates slug from team name, validates uniqueness
- Team settings: `defaultProvider`, `sharedApiKeys`, `allowMemberInvites`
- Team entity with PostgreSQL + TeamMember join table

### Knowledge Base (RAG)
- **`POST /api/knowledge`** — Create a knowledge base linked to an application
- **`GET /api/knowledge`** — List knowledge bases for current user
- **`GET /api/knowledge/app/:appId`** — List knowledge bases for an application
- **`GET /api/knowledge/:id`** — Get knowledge base details
- **`PUT /api/knowledge/:id`** — Update knowledge base settings
- **`DELETE /api/knowledge/:id`** — Delete knowledge base with all documents and chunks
- **`GET /api/knowledge/:id/documents`** — List documents in a knowledge base
- **`POST /api/knowledge/:id/documents`** — Upload a file (multipart) for processing
- **`POST /api/knowledge/:id/documents/text`** — Add text content as a document
- **`DELETE /api/knowledge/documents/:docId`** — Delete a document and its chunks
- **`POST /api/knowledge/:id/search`** — RAG semantic search with relevance scoring
- **`POST /api/knowledge/:id/context`** — Build formatted context string for AI prompts
- Document processing pipeline:
  - Text chunking with configurable chunk size (default 1000 chars) and overlap (200 chars)
  - Sentence-boundary-aware splitting for clean chunks
  - OpenAI `text-embedding-3-small` embedding generation per chunk
  - Cosine similarity vector search for retrieval
  - Fallback to regex text search when embeddings unavailable
- Configurable settings per knowledge base: chunk size, overlap, embedding model, top-K, similarity threshold
- Three MongoDB collections: `knowledge_bases`, `knowledge_documents`, `knowledge_chunks`
- Document status tracking: `processing` → `ready` | `error` with error messages
- Context builder produces formatted source-attributed text blocks for injection into system prompts

### In-App Notifications
- **`GET /api/notifications`** — List notifications with optional filters (unread, category)
- **`GET /api/notifications/count`** — Get unread notification count
- **`POST /api/notifications/:id/read`** — Mark a notification as read
- **`POST /api/notifications/read-all`** — Mark all notifications as read
- **`DELETE /api/notifications/:id`** — Delete a notification
- Global module with convenience helpers for other services:
  - `notifyUsageWarning(userId, resource, percent)` — Quota alerts
  - `notifySubscriptionChanged(userId, plan, action)` — Billing events
  - `notifyTeamInvite(userId, teamName, teamId)` — Team invitations
  - `notifyDocumentProcessed(userId, fileName, status)` — Knowledge base updates
  - `notifyWebhookFailure(userId, webhookName, error)` — Delivery failures
- Notification types: `info`, `success`, `warning`, `error` with distinct icons
- Optional action URL and label for click-through navigation
- Category-based filtering: billing, team, knowledge, webhook
- MongoDB-backed with compound indexes for efficient queries

### Frontend: Team Management Page
- Team list sidebar with create form (auto-slug generation from name)
- Team detail view with current user's role badge
- Member invite form with email input and role selector (Admin/Member/Viewer)
- Member list with avatar initials, email, and role badges (color-coded)
- Inline role change dropdown (owner only) and remove button
- Delete team confirmation (owner only)

### Frontend: Knowledge Base Page
- Knowledge base list sidebar with create form (linked to applications)
- Three-tab detail view: Documents, Search, Settings
- **Documents tab**: File upload button, text paste form with title/URL/content, document list with status badges and chunk counts, delete per document
- **Search tab**: Query input with relevance-scored results showing source file, similarity percentage, and content preview
- **Settings tab**: Read-only display of chunking and retrieval configuration
- Supported file types for upload: `.txt`, `.md`, `.json`, `.csv`, `.html`, `.xml`

### Frontend: Notification Bell Component
- Persistent bell icon in dashboard top bar with unread count badge (red circle)
- Click-to-expand dropdown (396px wide, max 480px tall, scrollable)
- 30-second polling interval for unread count updates
- Notification cards with type icons, time-ago timestamps, read/unread state
- "Mark all read" bulk action and per-notification "Mark read" / "Dismiss"
- Action links for click-through navigation (e.g., "View Plans", "View Team")
- Outside-click dismissal and proper z-indexing
- Unread notifications highlighted with subtle blue background and dot indicator

### Dashboard Navigation Updates
- Added Knowledge (📚) and Team (👥) to sidebar
- Notification bell + user avatar in sticky top bar
- Nav order: Overview → Applications → Knowledge → Marketplace → Analytics → Team → Billing → Webhooks → My Plugins → Themes → Settings
- Sidebar is now scrollable for screens with many nav items

---

## Phase 6 Additions

### Custom Domains
- **Entity**: `custom_domains` table with domain, status (pending/verifying/active/failed/expired), verification tokens, SSL tracking
- **DNS Verification**: Supports both CNAME and TXT record verification
  - CNAME: Point domain to `custom.agentbase.dev`
  - TXT: Add verification token at `_agentbase-verify.yourdomain.com`
  - Auto-detection of verification method with up to 10 check attempts
- **API Endpoints**: `POST /api/custom-domains`, `POST .../verify`, `GET .../dns`, `PUT`, `DELETE`
- **SSL Tracking**: Fields for SSL provider, expiration, and auto-renewal status
- **Domain Settings**: Configurable redirect-www, force-HTTPS, custom headers
- **Reserved Domains**: Prevents registration of platform-owned domains
- **Frontend**: Full management page with domain list, DNS setup instructions, verification workflow, status badges

### White-Label Branding
- **Entity**: `brandings` table with comprehensive customization fields
- **Color Scheme**: Primary, secondary, accent, background, text colors (validated hex)
- **Typography**: Body font and heading font families
- **Widget Customization**: Position (4 corners), border radius, welcome message, placeholder, header text, avatar URL
- **Email Customization**: From name, reply-to, header logo, footer text, accent color
- **Custom CSS**: Up to 5KB of injectable CSS with platform CSS variable system
- **CSS Variables API**: `GET /api/branding/css/:ownerId` generates CSS custom properties (--ab-primary, --ab-secondary, etc.)
- **Public API**: `GET /api/branding/public/:ownerId` for widget/embed consumption
- **"Powered by" Control**: Toggle Agentbase branding visibility
- **Frontend**: 4-tab configuration page:
  - Colors & Fonts with live color pickers and live preview
  - Widget settings (position, radius, messages)
  - Email branding (from name, reply-to, logo, footer)
  - Custom CSS editor with variable documentation

### SSO (SAML/OIDC)
- **Entity**: `sso_configs` table supporting both SAML and OIDC providers
- **SAML Support**: Entry point URL, issuer, X.509 certificate, callback URL
  - SP metadata XML generation: `GET /api/sso/:id/saml-metadata`
- **OIDC Support**: Discovery URL, client ID/secret, configurable scopes
- **Attribute Mapping**: Configurable mapping for email, firstName, lastName, displayName, role, groups
- **Auto-Provisioning**: Automatically create user accounts on first SSO login
- **Domain Restriction**: Limit SSO to specific email domains
- **Enforcement**: Option to require SSO for all team members
- **Login Tracking**: Total logins count and last login timestamp per SSO config
- **Security**: Client secrets and certificates sanitized in API responses
- **API Endpoints**: Full CRUD + toggle enable/disable

### Data Export & Import
- **Export Formats**: JSON (structured, portable) and CSV (tabular, spreadsheet-compatible)
- **Export Resources**:
  - `all`: Full backup with applications + conversations
  - `applications`: Application configs only
  - `conversations`: Chat histories with messages and metadata
  - `analytics`: Analytics event data
- **Import**: Upload JSON file to bulk-create applications as drafts
  - Error handling per record with summary report
  - Automatic slug deduplication on import
- **CSV Generation**: Automatic JSON flattening with nested key notation, proper escaping
- **Security**: Exports never include passwords, API keys, or billing data
- **Download**: Streams file with Content-Disposition for browser download
- **Frontend**: Split export/import page with:
  - Export: Resource selector, format picker (radio cards), download button
  - Import: Drag-and-drop file upload, result summary with error details
  - Data info section explaining contents, portability, and limits

### System Health Monitoring
- **Service Checks**: Real-time health for PostgreSQL, MongoDB, Redis, and AI Service
  - Each with latency measurement and error details
  - AI Service checked via HTTP health endpoint with 5s timeout
- **System Metrics**: OS-level memory (total/used/free/percent), CPU (cores, load averages), process (RSS, PID, uptime)
- **Platform Statistics**: Total users, applications, active subscriptions, plan breakdown
- **API Endpoints**: `GET /api/system/health`, `GET /api/system/stats`
- **Frontend Dashboard**:
  - Overall status banner (healthy/degraded/down with color coding)
  - Service status cards with latency and error display
  - Memory usage bar with color thresholds (green/amber/red)
  - CPU load averages (1m/5m/15m)
  - Process metrics (memory, uptime) in card grid
  - Platform stats with plan breakdown
  - Auto-refresh toggle (15-second interval)

### Navigation Updates
- Main nav: Added Branding, Domains, Export/Import
- Admin nav: Added System Health
- Full sidebar: Overview → Applications → Knowledge → Marketplace → Analytics → Team → Billing → Webhooks → My Plugins → Themes → Branding → Domains → Export/Import → Settings | Admin: Admin Panel → Audit Log → System Health
