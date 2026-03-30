from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.services.supabase_client import supabase_admin

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> dict:
    """Verify JWT and return user profile."""
    token = credentials.credentials
    try:
        user_response = supabase_admin.auth.get_user(token)
        user = user_response.user
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")

        profile = (
            supabase_admin.table("profiles")
            .select("*")
            .eq("id", str(user.id))
            .single()
            .execute()
        )
        if not profile.data:
            raise HTTPException(status_code=404, detail="Profile not found")

        if not profile.data.get("is_active"):
            raise HTTPException(status_code=403, detail="Account deactivated")

        return {**profile.data, "access_token": token}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")


async def require_admin(
    current_user: dict = Security(get_current_user),
) -> dict:
    """Require admin role."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user
