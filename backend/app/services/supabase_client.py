from supabase import create_client, Client
from app.config import get_settings

settings = get_settings()

# Public client (respects RLS, uses anon key)
supabase: Client = create_client(settings.supabase_url, settings.supabase_anon_key)

# Admin client (bypasses RLS, uses service role key)
supabase_admin: Client = create_client(
    settings.supabase_url, settings.supabase_service_role_key
)
