from fastapi import APIRouter, HTTPException, Depends
from app.models.user import UserSignup, UserLogin, UserProfile, AuthResponse
from app.services.supabase_client import supabase, supabase_admin
from app.services.auth_service import get_current_user

router = APIRouter()


@router.post("/signup")
async def signup(data: UserSignup):
    """Register a new user."""
    try:
        options = {}
        if data.full_name:
            options["data"] = {"full_name": data.full_name}

        response = supabase.auth.sign_up(
            {"email": data.email, "password": data.password, "options": options}
        )
        if not response.user:
            raise HTTPException(status_code=400, detail="Signup failed")

        return {
            "message": "User created successfully",
            "user_id": str(response.user.id),
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login")
async def login(data: UserLogin):
    """Login and return tokens."""
    try:
        response = supabase.auth.sign_in_with_password(
            {"email": data.email, "password": data.password}
        )
        if not response.user or not response.session:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        profile = (
            supabase_admin.table("profiles")
            .select("*")
            .eq("id", str(response.user.id))
            .single()
            .execute()
        )

        return AuthResponse(
            access_token=response.session.access_token,
            refresh_token=response.session.refresh_token,
            user=UserProfile(**profile.data),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/refresh")
async def refresh_token(refresh_token: str):
    """Refresh access token."""
    try:
        response = supabase.auth.refresh_session(refresh_token)
        if not response.session:
            raise HTTPException(status_code=401, detail="Invalid refresh token")

        return {
            "access_token": response.session.access_token,
            "refresh_token": response.session.refresh_token,
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.get("/me", response_model=UserProfile)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user profile."""
    return UserProfile(**current_user)
