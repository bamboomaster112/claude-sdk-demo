# AI CI/CD Migration Agent

A full-stack web application that uses Claude AI to migrate CI/CD pipelines from **TeamCity** and **Jenkins** to **GitHub Actions**. Users provide their pipeline configurations via paste, file upload, or screenshot, and the AI agent converts them to GitHub Actions YAML workflows through an interactive chat interface.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11+ / FastAPI / Uvicorn |
| AI Engine | Anthropic SDK + Claude Agent SDK with custom tools |
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS |
| Database & Auth | Supabase (PostgreSQL + Auth + Storage) |
| Real-time | WebSocket (streaming agent responses) |
| Containerization | Docker + Docker Compose |

## Features

- **Multi-turn agent chat** with streaming responses via WebSocket
- **4 source formats supported**: TeamCity Kotlin DSL, TeamCity JSON API, Jenkins Declarative Pipeline, Jenkins Scripted Pipeline
- **File upload & screenshot support** — drag-drop configs or paste screenshots of pipeline UIs
- **Syntax-highlighted output** with copy-to-clipboard and download-as-YAML buttons
- **Built-in YAML validation** of generated GitHub Actions workflows
- **Admin panel** — model control (Opus / Sonnet / Haiku), user management, usage analytics
- **Role-based access** — first user auto-promoted to admin, subsequent users default to `user` role
- **Session persistence** — resume previous migration conversations

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI entry point
│   │   ├── config.py               # Environment configuration
│   │   ├── agent/
│   │   │   ├── migration_agent.py  # Claude SDK agentic loop + streaming
│   │   │   ├── tools.py            # Custom parsing/generation tools
│   │   │   └── prompts.py          # System prompts with CI/CD mapping rules
│   │   ├── routers/
│   │   │   ├── auth.py             # Signup, login, token refresh
│   │   │   ├── users.py            # Admin user CRUD
│   │   │   ├── admin.py            # Model config, analytics
│   │   │   ├── migrations.py       # Session CRUD, file upload
│   │   │   └── agent.py            # WebSocket chat endpoint
│   │   ├── models/                 # Pydantic request/response models
│   │   └── services/               # Supabase client, auth service
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.tsx                 # Router with protected routes
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx       # Auth (login + signup)
│   │   │   ├── DashboardPage.tsx   # Session list + quick-start
│   │   │   ├── ChatPage.tsx        # Main migration workspace
│   │   │   ├── HistoryPage.tsx     # Past migration sessions
│   │   │   └── AdminPage.tsx       # Model, users, analytics
│   │   ├── components/
│   │   │   ├── chat/               # ChatWindow, MessageBubble, CodeBlock, InputArea, FileUpload
│   │   │   ├── admin/              # ModelSelector, UserManagement, UsageAnalytics
│   │   │   ├── auth/               # LoginForm, ProtectedRoute
│   │   │   └── layout/             # Header, Sidebar, Layout
│   │   ├── hooks/
│   │   │   ├── useAuth.ts          # Auth state management
│   │   │   └── useWebSocket.ts     # WebSocket connection + streaming
│   │   └── lib/
│   │       ├── api.ts              # REST API client
│   │       └── supabase.ts         # Supabase client init
│   ├── Dockerfile
│   └── vite.config.ts
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  # Full DB schema + RLS policies
└── docker-compose.yml
```

## Prerequisites

- **Python 3.11+** and **Node.js 20+** (for local dev)
- **Anthropic API key** — get one at [console.anthropic.com](https://console.anthropic.com)
- **Supabase project** — create one at [supabase.com](https://supabase.com)
- **Docker & Docker Compose** (optional, for containerized deployment)

## Setup

### 1. Database Setup

Go to your Supabase project's **SQL Editor** and run the contents of:

```
supabase/migrations/001_initial_schema.sql
```

This creates:
- `profiles` — user accounts with role (`admin`/`user`)
- `admin_settings` — global config (active model)
- `chat_sessions` — migration session metadata
- `chat_messages` — conversation history
- `migration_outputs` — generated GitHub Actions YAML
- `usage_logs` — token usage tracking
- Row-level security policies
- Auto-profile creation trigger (first user becomes admin)
- Storage bucket for file uploads

### 2. Backend Setup

```bash
cd backend

# Create .env from template
cp .env.example .env
# Edit .env with your actual keys
```

**Required environment variables** (in `backend/.env`):

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase publishable/anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (secret) key |
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `DEFAULT_MODEL` | Default Claude model (e.g., `claude-sonnet-4-6`) |
| `FRONTEND_URL` | Frontend origin for CORS (default: `http://localhost:5173`) |

```bash
# Install dependencies
pip install -r requirements.txt

# Start the backend
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup

```bash
cd frontend

# Create .env
cat > .env << 'EOF'
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
EOF

# Install dependencies
npm install

# Start dev server
npm run dev
```

### 4. Docker Compose (Alternative)

```bash
# Set environment variables in backend/.env and docker-compose.yml
docker-compose up
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |

## API Reference

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/signup` | Register (email, password, full_name) |
| `POST` | `/api/auth/login` | Login, returns access + refresh tokens |
| `POST` | `/api/auth/refresh` | Refresh access token |
| `GET` | `/api/auth/me` | Get current user profile |

### Migrations

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/migrations/sessions` | List user's sessions |
| `POST` | `/api/migrations/sessions` | Create session (source_type, title) |
| `GET` | `/api/migrations/sessions/{id}` | Get session + messages + outputs |
| `GET` | `/api/migrations/outputs/{session_id}` | Get generated YAML outputs |
| `POST` | `/api/migrations/upload` | Upload config file or screenshot |

### Admin (requires admin role)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/users/` | List all users |
| `PUT` | `/api/admin/users/{id}` | Update user role/status |
| `DELETE` | `/api/admin/users/{id}` | Deactivate user |
| `GET` | `/api/admin/settings` | Get admin settings |
| `PUT` | `/api/admin/settings/model` | Set active Claude model |
| `GET` | `/api/admin/analytics` | Usage stats (sessions, tokens, users) |

### WebSocket Agent Chat

| Protocol | Endpoint | Description |
|----------|----------|-------------|
| `WS` | `/ws/agent/{session_id}` | Real-time bidirectional chat |

**Handshake**: Send `{ "token": "your-jwt" }` as the first message.

**Send message**:
```json
{ "type": "message", "content": "Convert this pipeline...", "attachments": [] }
```

**Receive events**:
```json
{ "type": "assistant_chunk", "content": "partial text..." }
{ "type": "tool_use", "tool": "parse_jenkins_pipeline", "status": "running" }
{ "type": "assistant_complete", "content": "full response", "yaml_outputs": ["..."] }
```

## Agent Tools

The migration agent uses 5 custom tools during conversations:

| Tool | Purpose |
|------|---------|
| `parse_teamcity_kotlin` | Parse TeamCity Kotlin DSL (.kts) — extracts build types, steps, triggers, params |
| `parse_teamcity_json` | Parse TeamCity REST API JSON — extracts build configs from API output |
| `parse_jenkins_pipeline` | Parse Jenkinsfile — auto-detects declarative vs scripted, extracts stages/steps |
| `generate_github_actions` | Generate GitHub Actions YAML from parsed config |
| `validate_github_actions` | Validate YAML for syntax errors and common issues |

## Available Models

Admins can switch between these Claude models via the Admin Panel:

| Model | Best For |
|-------|----------|
| `claude-opus-4-6` | Complex multi-step migrations, maximum accuracy |
| `claude-sonnet-4-6` | Balanced speed + quality (default) |
| `claude-haiku-4-5-20251001` | Fast, simple migrations |

## Usage

1. **Sign up** — first user automatically becomes admin
2. **Start a migration** — choose source type (TeamCity Kotlin/JSON, Jenkins Declarative/Scripted)
3. **Paste or upload** your CI/CD config into the chat
4. **Chat with the agent** — ask follow-up questions, request changes, upload screenshots
5. **Copy the output** — download the generated GitHub Actions YAML
6. **Admin** — switch models, manage users, view usage analytics

## CI/CD Mapping Reference

<details>
<summary>TeamCity to GitHub Actions</summary>

| TeamCity | GitHub Actions |
|----------|---------------|
| Build Configuration | Workflow / Job |
| Build Step | Step |
| VCS Trigger | `on: push` / `on: pull_request` |
| Schedule Trigger | `on: schedule` with cron |
| Build Parameters | `inputs` / `env` |
| Agent Requirements | `runs-on` labels |
| Artifact Publishing | `actions/upload-artifact` |
| Snapshot Dependencies | `needs` between jobs |

</details>

<details>
<summary>Jenkins to GitHub Actions</summary>

| Jenkins | GitHub Actions |
|---------|---------------|
| `pipeline { }` | Workflow YAML |
| `agent any` | `runs-on: ubuntu-latest` |
| `agent { docker { image } }` | `container: image` |
| `stages { stage { } }` | `jobs:` |
| `steps { sh '...' }` | `run: ...` |
| `when { branch 'main' }` | `if: github.ref == 'refs/heads/main'` |
| `environment { }` | `env:` |
| `parameters { }` | `workflow_dispatch: inputs:` |
| `post { always { } }` | `if: always()` |
| `parallel { }` | Multiple jobs without `needs` |
| `withCredentials()` | `secrets.` references |

</details>
