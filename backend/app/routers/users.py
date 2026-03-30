from fastapi import APIRouter, HTTPException, Depends
from typing import List
from app.models.user import UserProfile, UserUpdate
from app.services.supabase_client import supabase_admin
from app.services.auth_service import require_admin

router = APIRouter()


@router.get("/", response_model=List[UserProfile])
async def list_users(admin: dict = Depends(require_admin)):
    """List all users (admin only)."""
    response = (
        supabase_admin.table("profiles")
        .select("*")
        .order("created_at", desc=True)
        .execute()
    )
    return [UserProfile(**u) for u in response.data]


@router.put("/{user_id}", response_model=UserProfile)
async def update_user(
    user_id: str, data: UserUpdate, admin: dict = Depends(require_admin)
):
    """Update user role/status (admin only)."""
    update_data = data.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    response = (
        supabase_admin.table("profiles")
        .update(update_data)
        .eq("id", user_id)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="User not found")

    return UserProfile(**response.data[0])


@router.delete("/{user_id}")
async def deactivate_user(user_id: str, admin: dict = Depends(require_admin)):
    """Deactivate a user (admin only)."""
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")

    response = (
        supabase_admin.table("profiles")
        .update({"is_active": False})
        .eq("id", user_id)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": "User deactivated"}
