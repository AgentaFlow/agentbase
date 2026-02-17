# Database Migrations

This directory contains TypeORM migrations for the PostgreSQL database.

## Running Migrations

### Initial Setup

1. **Ensure PostgreSQL is running:**
   ```bash
   docker-compose up -d postgres
   ```

2. **Create .env file from template:**
   ```bash
   cp .env.example .env
   # Update database credentials if needed
   ```

3. **Run migrations:**
   ```bash
   cd packages/core
   pnpm migration:run
   ```

### Migration Commands

From the `packages/core` directory:

```bash
# Run pending migrations
pnpm migration:run

# Revert the last migration
pnpm migration:revert

# Show migration status
pnpm migration:show

# Generate a new migration (after entity changes)
pnpm migration:generate src/database/migrations/MigrationName

# Create an empty migration file
pnpm migration:create src/database/migrations/MigrationName
```

### Auto-run Migrations on Startup

To automatically run migrations when the application starts, set in `.env`:
```
RUN_MIGRATIONS=true
```

**⚠️ Warning:** This is not recommended for production. Use explicit migration commands instead.

## Current Migrations

### 1708192000000-InitialSchema.ts

Creates all core tables:
- `users` - User accounts with OAuth support
- `applications` - AI applications
- `plugins` - Plugin marketplace entries
- `themes` - Theme registry
- `subscriptions` - Billing and usage tracking
- `installed_plugins` - Per-app plugin installations
- `api_keys` - API key authentication
- `webhooks` - Webhook configurations
- `teams` - Team/organization management
- `team_members` - Team membership with roles
- `custom_domains` - Custom domain management
- `brandings` - White-label branding configurations
- `sso_configs` - SSO/SAML/OIDC configurations

## Development vs Production

### Development
- Migrations should be run manually: `pnpm migration:run`
- Test migrations with `migration:revert` to ensure rollback works
- `synchronize: false` is set to prevent auto-schema changes

### Production
- Always run migrations before deploying new code
- Never use `synchronize: true` or `RUN_MIGRATIONS=true`
- Use migration commands in CI/CD pipeline
- Always backup database before running migrations

## Troubleshooting

**"relation already exists" error:**
```bash
# Your database may have been auto-created by synchronize
# Option 1: Drop and recreate (development only!)
docker-compose down -v
docker-compose up -d postgres
pnpm migration:run

# Option 2: Mark migrations as run without executing
# (Advanced - not recommended for beginners)
```

**Migration failed halfway:**
```bash
# Revert the last migration
pnpm migration:revert

# Fix the migration file
# Run again
pnpm migration:run
```

**Check what migrations have been run:**
```bash
pnpm migration:show
```
