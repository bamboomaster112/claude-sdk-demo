import json
import base64
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.supabase_client import supabase_admin
from app.agent.migration_agent import run_migration_agent

router = APIRouter()


async def verify_ws_token(token: str) -> dict | None:
    """Verify WebSocket auth token and return user profile."""
    try:
        user_response = supabase_admin.auth.get_user(token)
        user = user_response.user
        if not user:
            return None
        profile = (
            supabase_admin.table("profiles")
            .select("*")
            .eq("id", str(user.id))
            .single()
            .execute()
        )
        return profile.data if profile.data else None
    except Exception:
        return None


@router.websocket("/ws/agent/{session_id}")
async def agent_websocket(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time agent chat."""
    await websocket.accept()

    # Authenticate via first message
    try:
        auth_msg = await websocket.receive_json()
        token = auth_msg.get("token")
        if not token:
            await websocket.send_json({"type": "error", "message": "Token required"})
            await websocket.close()
            return

        user = await verify_ws_token(token)
        if not user:
            await websocket.send_json({"type": "error", "message": "Invalid token"})
            await websocket.close()
            return
    except Exception:
        await websocket.close()
        return

    # Verify session ownership
    session = (
        supabase_admin.table("chat_sessions")
        .select("*")
        .eq("id", session_id)
        .eq("user_id", user["id"])
        .single()
        .execute()
    )
    if not session.data:
        await websocket.send_json({"type": "error", "message": "Session not found"})
        await websocket.close()
        return

    session_data = session.data
    await websocket.send_json({"type": "connected", "session": session_data})

    # Load conversation history from DB
    history_response = (
        supabase_admin.table("chat_messages")
        .select("*")
        .eq("session_id", session_id)
        .order("created_at")
        .execute()
    )
    conversation_history = []
    for msg in history_response.data:
        conversation_history.append({
            "role": msg["role"],
            "content": msg["content"],
        })

    # Chat loop
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type", "message")

            if msg_type == "message":
                user_content = data.get("content", "")
                attachments = data.get("attachments", [])

                # Handle image attachment
                image_data = None
                if attachments:
                    for att in attachments:
                        if att.get("type", "").startswith("image/"):
                            image_data = {
                                "base64": att["data"],
                                "media_type": att["type"],
                            }
                            break

                # Save user message to DB
                supabase_admin.table("chat_messages").insert({
                    "session_id": session_id,
                    "role": "user",
                    "content": user_content,
                    "message_type": "image" if image_data else "text",
                    "metadata": {"attachments": len(attachments)} if attachments else None,
                }).execute()

                # Run the agent
                full_response = ""
                yaml_outputs = []

                async for event in run_migration_agent(
                    user_message=user_content,
                    source_type=session_data["source_type"],
                    model=session_data["model_used"],
                    conversation_history=conversation_history,
                    image_data=image_data,
                ):
                    if event["type"] == "assistant_chunk":
                        await websocket.send_json(event)
                    elif event["type"] == "tool_use":
                        await websocket.send_json(event)
                    elif event["type"] == "assistant_complete":
                        full_response = event["content"]
                        yaml_outputs = event.get("yaml_outputs", [])
                        conversation_history = event.get("messages", conversation_history)
                        await websocket.send_json({
                            "type": "assistant_complete",
                            "content": full_response,
                            "yaml_outputs": yaml_outputs,
                        })

                # Save assistant message to DB
                msg_type_db = "yaml_output" if yaml_outputs else "text"
                supabase_admin.table("chat_messages").insert({
                    "session_id": session_id,
                    "role": "assistant",
                    "content": full_response,
                    "message_type": msg_type_db,
                    "metadata": {"yaml_count": len(yaml_outputs)} if yaml_outputs else None,
                }).execute()

                # Save YAML outputs
                for yaml_content in yaml_outputs:
                    supabase_admin.table("migration_outputs").insert({
                        "session_id": session_id,
                        "original_config": user_content[:5000],
                        "github_actions_yaml": yaml_content,
                        "source_type": session_data["source_type"],
                        "validation_status": "generated",
                    }).execute()

                # Log usage
                supabase_admin.table("usage_logs").insert({
                    "user_id": user["id"],
                    "session_id": session_id,
                    "model": session_data["model_used"],
                }).execute()

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
