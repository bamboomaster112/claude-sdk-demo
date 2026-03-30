from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import List
from app.models.migration import (
    SessionCreate,
    SessionResponse,
    SessionDetail,
    ChatMessage,
    MigrationOutput,
)
from app.services.supabase_client import supabase_admin
from app.services.auth_service import get_current_user
import uuid

router = APIRouter()


@router.get("/sessions", response_model=List[SessionResponse])
async def list_sessions(current_user: dict = Depends(get_current_user)):
    """List user's chat sessions."""
    response = (
        supabase_admin.table("chat_sessions")
        .select("*")
        .eq("user_id", current_user["id"])
        .order("updated_at", desc=True)
        .execute()
    )
    return [SessionResponse(**s) for s in response.data]


@router.post("/sessions", response_model=SessionResponse)
async def create_session(
    data: SessionCreate, current_user: dict = Depends(get_current_user)
):
    """Create a new migration session."""
    # Get active model from admin settings
    model_setting = (
        supabase_admin.table("admin_settings")
        .select("setting_value")
        .eq("setting_key", "active_model")
        .single()
        .execute()
    )
    model = model_setting.data["setting_value"].strip('"') if model_setting.data else "claude-sonnet-4-6"

    session_data = {
        "user_id": current_user["id"],
        "title": data.title or f"New {data.source_type} migration",
        "source_type": data.source_type,
        "model_used": model,
        "status": "active",
    }

    response = (
        supabase_admin.table("chat_sessions").insert(session_data).execute()
    )
    return SessionResponse(**response.data[0])


@router.get("/sessions/{session_id}", response_model=SessionDetail)
async def get_session(session_id: str, current_user: dict = Depends(get_current_user)):
    """Get session with messages and outputs."""
    session = (
        supabase_admin.table("chat_sessions")
        .select("*")
        .eq("id", session_id)
        .eq("user_id", current_user["id"])
        .single()
        .execute()
    )
    if not session.data:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = (
        supabase_admin.table("chat_messages")
        .select("*")
        .eq("session_id", session_id)
        .order("created_at")
        .execute()
    )

    outputs = (
        supabase_admin.table("migration_outputs")
        .select("*")
        .eq("session_id", session_id)
        .order("created_at", desc=True)
        .execute()
    )

    return SessionDetail(
        session=SessionResponse(**session.data),
        messages=[ChatMessage(**m) for m in messages.data],
        outputs=[MigrationOutput(**o) for o in outputs.data],
    )


@router.get("/outputs/{session_id}", response_model=List[MigrationOutput])
async def get_outputs(session_id: str, current_user: dict = Depends(get_current_user)):
    """Get migration outputs for a session."""
    # Verify ownership
    session = (
        supabase_admin.table("chat_sessions")
        .select("id")
        .eq("id", session_id)
        .eq("user_id", current_user["id"])
        .single()
        .execute()
    )
    if not session.data:
        raise HTTPException(status_code=404, detail="Session not found")

    outputs = (
        supabase_admin.table("migration_outputs")
        .select("*")
        .eq("session_id", session_id)
        .execute()
    )
    return [MigrationOutput(**o) for o in outputs.data]


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Upload a config file or screenshot to Supabase Storage."""
    file_ext = file.filename.split(".")[-1] if file.filename else "bin"
    file_path = f"{current_user['id']}/{uuid.uuid4()}.{file_ext}"

    content = await file.read()
    response = supabase_admin.storage.from_("uploads").upload(
        file_path, content, {"content-type": file.content_type or "application/octet-stream"}
    )

    public_url = supabase_admin.storage.from_("uploads").get_public_url(file_path)

    return {
        "file_path": file_path,
        "url": public_url,
        "filename": file.filename,
        "content_type": file.content_type,
    }
