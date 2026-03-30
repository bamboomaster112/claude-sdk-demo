import asyncio
import json
from typing import AsyncGenerator
from anthropic import AsyncAnthropic
from app.config import get_settings
from app.agent.prompts import build_system_prompt
from app.agent.tools import TOOL_DEFINITIONS

settings = get_settings()

client = AsyncAnthropic(api_key=settings.anthropic_api_key)

# Build tool schemas for Claude API
TOOLS_SCHEMA = []
for tool_def in TOOL_DEFINITIONS:
    properties = {}
    required = []
    for param_name, param_info in tool_def["parameters"].items():
        properties[param_name] = {
            "type": param_info["type"],
            "description": param_info["description"],
        }
        if "default" not in param_info:
            required.append(param_name)

    TOOLS_SCHEMA.append({
        "name": tool_def["name"],
        "description": tool_def["description"],
        "input_schema": {
            "type": "object",
            "properties": properties,
            "required": required,
        },
    })

# Map tool names to functions
TOOL_FUNCTIONS = {t["name"]: t["function"] for t in TOOL_DEFINITIONS}


async def run_migration_agent(
    user_message: str,
    source_type: str,
    model: str,
    conversation_history: list[dict] | None = None,
    image_data: dict | None = None,
) -> AsyncGenerator[dict, None]:
    """Run the migration agent with streaming responses.

    Args:
        user_message: The user's message/input
        source_type: Type of CI/CD source (teamcity_kotlin, jenkins_declarative, etc.)
        model: Claude model to use
        conversation_history: Previous messages for multi-turn conversation
        image_data: Optional image data dict with 'base64' and 'media_type' keys

    Yields:
        Dict messages with type and content for streaming to the client
    """
    system_prompt = build_system_prompt(source_type)
    messages = list(conversation_history) if conversation_history else []

    # Build user message content
    content = []
    if image_data:
        content.append({
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": image_data["media_type"],
                "data": image_data["base64"],
            },
        })
    content.append({"type": "text", "text": user_message})

    messages.append({"role": "user", "content": content})

    # Agentic loop: keep going until Claude stops calling tools
    while True:
        full_response = ""
        tool_calls = []

        async with client.messages.stream(
            model=model,
            max_tokens=4096,
            system=system_prompt,
            messages=messages,
            tools=TOOLS_SCHEMA,
        ) as stream:
            async for event in stream:
                if event.type == "content_block_start":
                    if hasattr(event.content_block, "text"):
                        pass  # text block starting
                    elif hasattr(event.content_block, "type") and event.content_block.type == "tool_use":
                        tool_calls.append({
                            "id": event.content_block.id,
                            "name": event.content_block.name,
                            "input": "",
                        })
                elif event.type == "content_block_delta":
                    if hasattr(event.delta, "text"):
                        full_response += event.delta.text
                        yield {"type": "assistant_chunk", "content": event.delta.text}
                    elif hasattr(event.delta, "partial_json"):
                        if tool_calls:
                            tool_calls[-1]["input"] += event.delta.partial_json

        # Get the full message for conversation history
        response_message = await stream.get_final_message()
        messages.append({"role": "assistant", "content": response_message.content})

        # If no tool calls, we're done
        if not tool_calls:
            break

        # Execute tool calls
        tool_results = []
        for tool_call in tool_calls:
            yield {
                "type": "tool_use",
                "tool": tool_call["name"],
                "status": "running",
            }

            try:
                input_data = json.loads(tool_call["input"]) if isinstance(tool_call["input"], str) else tool_call["input"]
                func = TOOL_FUNCTIONS.get(tool_call["name"])
                if func:
                    result = func(**input_data)
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": tool_call["id"],
                        "content": json.dumps(result) if isinstance(result, (dict, list)) else str(result),
                    })
                else:
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": tool_call["id"],
                        "content": f"Unknown tool: {tool_call['name']}",
                        "is_error": True,
                    })
            except Exception as e:
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": tool_call["id"],
                    "content": f"Tool error: {str(e)}",
                    "is_error": True,
                })

            yield {
                "type": "tool_use",
                "tool": tool_call["name"],
                "status": "completed",
            }

        messages.append({"role": "user", "content": tool_results})

    # Extract any YAML output from the response
    yaml_blocks = extract_yaml_blocks(full_response)

    yield {
        "type": "assistant_complete",
        "content": full_response,
        "yaml_outputs": yaml_blocks,
        "messages": messages,
    }


def extract_yaml_blocks(text: str) -> list[str]:
    """Extract YAML code blocks from markdown text."""
    pattern = r"```ya?ml\n(.*?)```"
    matches = re.findall(pattern, text, re.DOTALL)
    return matches


import re
