from supabase import create_client, Client
from app.config import settings

# Use service_role key on the backend (never expose this to the frontend)
supabase: Client = create_client(
    settings.supabase_url,
    settings.supabase_service_role_key,
)
