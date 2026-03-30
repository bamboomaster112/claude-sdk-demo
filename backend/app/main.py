from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.routers import auth, users, admin, migrations, agent

settings = get_settings()

app = FastAPI(
    title="AI CI/CD Migration Agent",
    description="Migrate TeamCity and Jenkins pipelines to GitHub Actions using Claude AI",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/admin/users", tags=["admin-users"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(migrations.router, prefix="/api/migrations", tags=["migrations"])
app.include_router(agent.router, tags=["agent"])


@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}
