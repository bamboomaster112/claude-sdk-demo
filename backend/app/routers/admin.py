from fastapi import APIRouter, HTTPException, Depends
from app.models.admin import ModelConfig, AdminSettings, UsageStats
from app.services.supabase_client import supabase_admin
from app.services.auth_service import require_admin
import json

router = APIRouter()

ALLOWED_MODELS = [
    "claude-opus-4-6",
    "claude-sonnet-4-6",
    "claude-haiku-4-5-20251001",
]


@router.get("/settings")
async def get_settings(admin: dict = Depends(require_admin)):
    """Get all admin settings."""
    response = supabase_admin.table("admin_settings").select("*").execute()
    settings = {}
    for row in response.data:
        settings[row["setting_key"]] = row["setting_value"]
    return settings


@router.put("/settings/model")
async def set_model(data: ModelConfig, admin: dict = Depends(require_admin)):
    """Set the active Claude model."""
    if data.model not in ALLOWED_MODELS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid model. Allowed: {', '.join(ALLOWED_MODELS)}",
        )

    response = (
        supabase_admin.table("admin_settings")
        .upsert(
            {
                "setting_key": "active_model",
                "setting_value": json.dumps(data.model),
                "updated_by": admin["id"],
            },
            on_conflict="setting_key",
        )
        .execute()
    )

    return {"message": f"Model set to {data.model}", "model": data.model}


@router.get("/analytics", response_model=UsageStats)
async def get_analytics(admin: dict = Depends(require_admin)):
    """Get usage analytics."""
    sessions = supabase_admin.table("chat_sessions").select("id", count="exact").execute()
    usage = supabase_admin.table("usage_logs").select("*").execute()

    total_in = sum(row.get("input_tokens", 0) or 0 for row in usage.data)
    total_out = sum(row.get("output_tokens", 0) or 0 for row in usage.data)

    unique_users = set(row["user_id"] for row in usage.data) if usage.data else set()

    model_breakdown = {}
    for row in usage.data:
        model = row.get("model", "unknown")
        model_breakdown[model] = model_breakdown.get(model, 0) + 1

    return UsageStats(
        total_sessions=sessions.count or 0,
        total_tokens_in=total_in,
        total_tokens_out=total_out,
        active_users=len(unique_users),
        model_breakdown=model_breakdown,
    )
