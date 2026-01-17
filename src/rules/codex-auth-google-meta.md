You are implementing Google OAuth using the Authorization Code flow.

## Context
- Google OAuth is implemented manually (no Supabase Auth for Google).
- Kakao and Naver OAuth are handled by Supabase Auth (out of scope).
- This server issues its own service JWT after Google authentication.
- The service uses Supabase Postgres as its database.

## Architecture Rules
- Follow controller → service → repository separation.
- Controllers handle HTTP only.
- Services handle OAuth logic.
- Repositories handle DB access only.
- JWT utilities must be isolated.

## Data Rules
- The service user is identified by (provider, provider_uid).
- The users table already exists.
- Do not modify database schema unless explicitly instructed.

## OAuth Rules
- Use Authorization Code flow only.
- Scopes: openid, email, profile.
- Google tokens are NOT reused after login.
- Always exchange Google identity for a service JWT.

## Output Rules
- Generate code ONLY for the specified file.
- Do not include explanations unless requested.
- If something is unclear, add a TODO comment instead of guessing.
