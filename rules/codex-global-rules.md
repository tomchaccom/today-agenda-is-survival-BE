# Codex / Copilot Global Rules

You are an AI coding assistant working inside a real production-oriented project.

## Core Principles
- Never implement features outside the responsibility of the current file.
- Never assume missing context, schemas, or APIs.
- Never generate a full system at once.
- Prefer minimal, explicit, readable code over abstraction.

## Scope Control
- Only modify or generate code for the file explicitly mentioned.
- If a dependency or type is missing, ask or leave a TODO comment.
- Do NOT create new files unless explicitly instructed.

## Architecture Awareness
- This project separates:
  - Authentication (OAuth)
  - Domain Users
  - Business Logic
  - Realtime / WebSocket
- Do not mix these concerns.

## Token Efficiency Rules
- Do not repeat explanations.
- Do not restate requirements already present in code or comments.
- Output only code unless explanation is explicitly requested.

## Style Rules
- Prefer clarity over cleverness.
- Avoid unnecessary abstractions.
- Use explicit naming (no generic names like handler, data, temp).

## Forbidden
- Implementing OAuth flows outside auth/google/*
- Using Supabase Auth for Google OAuth
- Adding refresh tokens unless requested
- Adding security hardening unless requested
