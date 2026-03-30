from pydantic import BaseModel
from typing import Optional


class ModelConfig(BaseModel):
    model: str  # claude-opus-4-6, claude-sonnet-4-6, claude-haiku-4-5-20251001


class AdminSettings(BaseModel):
    active_model: str
    updated_by: Optional[str] = None
    updated_at: Optional[str] = None


class UsageStats(BaseModel):
    total_sessions: int
    total_tokens_in: int
    total_tokens_out: int
    active_users: int
    model_breakdown: dict
