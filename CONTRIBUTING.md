# Contributing to Agentbase

Thanks for your interest in contributing to Agentbase! This document covers how to get set up and submit changes.

## Development Setup

1. Fork and clone the repository
2. Copy `.env.example` to `.env` and configure
3. Run `docker compose up -d` for databases
4. Run `pnpm install` at the root
5. Run `pnpm dev` to start all services

## Project Structure

This is a pnpm monorepo with the following packages:

- **`packages/core`** — NestJS backend (TypeScript). Handles auth, applications, plugins, themes.
- **`packages/frontend`** — Next.js 14 frontend (TypeScript + Tailwind).
- **`packages/ai-service`** — FastAPI microservice (Python). Manages AI provider integrations.
- **`packages/shared`** — Shared TypeScript types used across packages.
- **`packages/plugins`** — Plugin SDK and example plugins.
- **`packages/themes`** — Theme SDK and starter themes.

## Code Style

- TypeScript: Follow existing conventions, use strict mode
- Python: Follow PEP 8, use type hints
- Use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, etc.

## Submitting Changes

1. Create a feature branch from `main`
2. Make your changes with clear commit messages
3. Ensure tests pass: `pnpm test`
4. Open a pull request with a description of what changed and why

## Reporting Issues

Open an issue on GitHub with a clear description, steps to reproduce, and expected vs actual behavior.

## License

By contributing, you agree that your contributions will be licensed under GPL-3.0.
