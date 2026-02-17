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

Built by [AgentaFlow](https://agentaflow.com)

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
