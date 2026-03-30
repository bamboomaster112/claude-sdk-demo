from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class SessionCreate(BaseModel):
    title: Optional[str] = None
    source_type: str  # teamcity_kotlin, teamcity_json, jenkins_declarative, jenkins_scripted


class SessionResponse(BaseModel):
    id: str
    user_id: str
    title: Optional[str] = None
    source_type: str
    claude_session_id: Optional[str] = None
    model_used: str
    status: str
    created_at: str
    updated_at: str


class ChatMessage(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    message_type: str
    metadata: Optional[dict] = None
    created_at: str


class MigrationOutput(BaseModel):
    id: str
    session_id: str
    original_config: str
    github_actions_yaml: str
    source_type: str
    validation_status: str
    created_at: str


class SessionDetail(BaseModel):
    session: SessionResponse
    messages: List[ChatMessage]
    outputs: List[MigrationOutput]
