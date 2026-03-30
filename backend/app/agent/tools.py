import json
import re
import yaml


def parse_teamcity_kotlin(config: str) -> dict:
    """Parse TeamCity Kotlin DSL (.kts) and extract build configuration structure.

    Args:
        config: The Kotlin DSL configuration content

    Returns:
        Dictionary with extracted build steps, triggers, params, and structure
    """
    result = {
        "type": "teamcity_kotlin",
        "build_types": [],
        "params": [],
        "vcs_roots": [],
        "triggers": [],
        "steps": [],
        "raw_config": config,
    }

    # Extract build type names
    build_types = re.findall(r'buildType\s*\{[^}]*name\s*=\s*"([^"]+)"', config)
    result["build_types"] = build_types

    # Extract steps
    step_blocks = re.findall(
        r'step\s*\{[^}]*name\s*=\s*"([^"]+)"[^}]*type\s*=\s*"([^"]+)"', config
    )
    for name, step_type in step_blocks:
        result["steps"].append({"name": name, "type": step_type})

    # Extract script steps
    script_steps = re.findall(r'script\s*\{[^}]*scriptContent\s*=\s*"([^"]*)"', config)
    for script in script_steps:
        result["steps"].append({"name": "Script", "type": "script", "content": script})

    # Extract params
    params = re.findall(r'param\s*\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\)', config)
    result["params"] = [{"name": k, "value": v} for k, v in params]

    # Extract triggers
    if "vcs {" in config or "vcs{" in config:
        result["triggers"].append({"type": "vcs"})
    if "schedule {" in config or "schedule{" in config:
        result["triggers"].append({"type": "schedule"})

    return result


def parse_teamcity_json(config: str) -> dict:
    """Parse TeamCity REST API JSON output.

    Args:
        config: JSON string from TeamCity REST API

    Returns:
        Dictionary with extracted build configuration
    """
    try:
        data = json.loads(config)
    except json.JSONDecodeError:
        return {"error": "Invalid JSON", "raw_config": config}

    result = {
        "type": "teamcity_json",
        "build_types": [],
        "steps": [],
        "triggers": [],
        "params": [],
        "raw_config": config,
    }

    # Handle single build type or list
    build_types = data.get("buildType", [data] if "id" in data else [])
    if isinstance(build_types, dict):
        build_types = [build_types]

    for bt in build_types:
        result["build_types"].append({
            "id": bt.get("id", ""),
            "name": bt.get("name", ""),
        })

        # Extract steps
        steps = bt.get("steps", {}).get("step", [])
        for step in steps:
            props = {}
            for prop in step.get("properties", {}).get("property", []):
                props[prop["name"]] = prop.get("value", "")
            result["steps"].append({
                "name": step.get("name", ""),
                "type": step.get("type", ""),
                "properties": props,
            })

        # Extract triggers
        triggers = bt.get("triggers", {}).get("trigger", [])
        for trigger in triggers:
            result["triggers"].append({
                "type": trigger.get("type", ""),
                "id": trigger.get("id", ""),
            })

    return result


def parse_jenkins_pipeline(pipeline_code: str, pipeline_type: str = "auto") -> dict:
    """Parse Jenkins pipeline code (declarative or scripted).

    Args:
        pipeline_code: The Jenkinsfile content
        pipeline_type: 'declarative', 'scripted', or 'auto' for auto-detect

    Returns:
        Dictionary with extracted pipeline structure
    """
    if pipeline_type == "auto":
        pipeline_type = (
            "declarative" if "pipeline {" in pipeline_code or "pipeline{" in pipeline_code
            else "scripted"
        )

    result = {
        "type": f"jenkins_{pipeline_type}",
        "pipeline_type": pipeline_type,
        "agent": None,
        "stages": [],
        "environment": [],
        "parameters": [],
        "post_actions": [],
        "raw_config": pipeline_code,
    }

    # Extract agent
    agent_match = re.search(r'agent\s+(\w+)', pipeline_code)
    if agent_match:
        result["agent"] = agent_match.group(1)

    agent_docker = re.search(r"agent\s*\{[^}]*docker\s*\{[^}]*image\s*['\"]([^'\"]+)", pipeline_code)
    if agent_docker:
        result["agent"] = f"docker:{agent_docker.group(1)}"

    # Extract stages
    stage_names = re.findall(r"stage\s*\(\s*['\"]([^'\"]+)['\"]", pipeline_code)
    result["stages"] = [{"name": name} for name in stage_names]

    # Extract environment variables
    env_vars = re.findall(
        r"environment\s*\{([^}]*)\}", pipeline_code, re.DOTALL
    )
    for env_block in env_vars:
        pairs = re.findall(r"(\w+)\s*=\s*['\"]?([^'\"\n]+)", env_block)
        result["environment"] = [{"name": k, "value": v.strip()} for k, v in pairs]

    # Extract parameters
    params = re.findall(
        r"(string|booleanParam|choice)\s*\([^)]*name\s*:\s*['\"]([^'\"]+)", pipeline_code
    )
    result["parameters"] = [{"type": t, "name": n} for t, n in params]

    # Extract post actions
    post_match = re.search(r"post\s*\{(.*?)\n\s*\}", pipeline_code, re.DOTALL)
    if post_match:
        post_types = re.findall(r"(always|success|failure|unstable|changed)\s*\{", post_match.group(1))
        result["post_actions"] = post_types

    return result


def generate_github_actions(parsed_config: dict, source_type: str) -> str:
    """Generate a GitHub Actions YAML workflow from a parsed CI/CD configuration.

    Args:
        parsed_config: The parsed configuration dictionary
        source_type: The source CI/CD system type

    Returns:
        Generated GitHub Actions YAML string
    """
    workflow = {
        "name": "CI/CD Pipeline",
        "on": {"push": {"branches": ["main"]}, "pull_request": {"branches": ["main"]}},
        "jobs": {},
    }

    # Map triggers
    for trigger in parsed_config.get("triggers", []):
        t_type = trigger.get("type", "")
        if "schedule" in t_type:
            workflow["on"]["schedule"] = [{"cron": "0 0 * * *"}]
        if "vcs" in t_type or "push" in t_type:
            workflow["on"]["push"] = {"branches": ["main", "develop"]}

    # Map environment
    env_vars = parsed_config.get("environment", [])
    if env_vars:
        workflow["env"] = {e["name"]: e["value"] for e in env_vars}

    # Map stages/steps to jobs
    stages = parsed_config.get("stages", [])
    steps_list = parsed_config.get("steps", [])

    if stages:
        for i, stage in enumerate(stages):
            job_id = re.sub(r"[^a-zA-Z0-9_]", "_", stage["name"]).lower()
            job = {
                "name": stage["name"],
                "runs-on": "ubuntu-latest",
                "steps": [
                    {"name": "Checkout", "uses": "actions/checkout@v4"},
                    {"name": stage["name"], "run": f"echo 'TODO: implement {stage['name']}'"},
                ],
            }
            if i > 0:
                prev_id = re.sub(r"[^a-zA-Z0-9_]", "_", stages[i - 1]["name"]).lower()
                job["needs"] = prev_id
            workflow["jobs"][job_id] = job
    elif steps_list:
        steps = [{"name": "Checkout", "uses": "actions/checkout@v4"}]
        for step in steps_list:
            steps.append({
                "name": step.get("name", "Step"),
                "run": step.get("content", f"echo 'TODO: implement {step.get('name', 'step')}'"),
            })
        workflow["jobs"]["build"] = {
            "name": "Build",
            "runs-on": "ubuntu-latest",
            "steps": steps,
        }
    else:
        workflow["jobs"]["build"] = {
            "name": "Build",
            "runs-on": "ubuntu-latest",
            "steps": [
                {"name": "Checkout", "uses": "actions/checkout@v4"},
                {"name": "Build", "run": "echo 'TODO: add build steps'"},
            ],
        }

    return yaml.dump(workflow, default_flow_style=False, sort_keys=False)


def validate_github_actions(yaml_content: str) -> dict:
    """Validate GitHub Actions YAML for syntax and common issues.

    Args:
        yaml_content: The GitHub Actions YAML string

    Returns:
        Dictionary with validation results
    """
    result = {"valid": True, "errors": [], "warnings": []}

    try:
        data = yaml.safe_load(yaml_content)
    except yaml.YAMLError as e:
        return {"valid": False, "errors": [f"YAML syntax error: {str(e)}"], "warnings": []}

    if not isinstance(data, dict):
        result["valid"] = False
        result["errors"].append("Workflow must be a YAML mapping")
        return result

    # Check required fields
    if "on" not in data:
        result["errors"].append("Missing required 'on' trigger")
        result["valid"] = False

    if "jobs" not in data:
        result["errors"].append("Missing required 'jobs' section")
        result["valid"] = False
    elif isinstance(data["jobs"], dict):
        for job_name, job in data["jobs"].items():
            if not isinstance(job, dict):
                continue
            if "runs-on" not in job and "uses" not in job:
                result["errors"].append(f"Job '{job_name}' missing 'runs-on'")
                result["valid"] = False
            if "steps" not in job and "uses" not in job:
                result["warnings"].append(f"Job '{job_name}' has no 'steps'")

    # Check for common issues
    yaml_str = yaml.dump(data) if isinstance(data, dict) else yaml_content
    if "${{" in yaml_content and "}}" in yaml_content:
        # Check for unquoted expressions
        if re.search(r':\s*\$\{\{', yaml_content):
            result["warnings"].append(
                "Expressions used as values should be quoted: ${{ expr }}"
            )

    if "name" not in data:
        result["warnings"].append("Consider adding a 'name' field for the workflow")

    return result


# Tool definitions for the Claude Agent SDK MCP server
TOOL_DEFINITIONS = [
    {
        "name": "parse_teamcity_kotlin",
        "description": "Parse TeamCity Kotlin DSL (.kts) configuration and extract build steps, triggers, parameters, and structure.",
        "function": parse_teamcity_kotlin,
        "parameters": {
            "config": {"type": "string", "description": "The TeamCity Kotlin DSL configuration content"}
        },
    },
    {
        "name": "parse_teamcity_json",
        "description": "Parse TeamCity REST API JSON output and extract build configuration details.",
        "function": parse_teamcity_json,
        "parameters": {
            "config": {"type": "string", "description": "JSON string from TeamCity REST API"}
        },
    },
    {
        "name": "parse_jenkins_pipeline",
        "description": "Parse Jenkins pipeline code (declarative or scripted) and extract stages, steps, environment, and parameters.",
        "function": parse_jenkins_pipeline,
        "parameters": {
            "pipeline_code": {"type": "string", "description": "The Jenkinsfile/pipeline code content"},
            "pipeline_type": {
                "type": "string",
                "description": "Pipeline type: 'declarative', 'scripted', or 'auto'",
                "default": "auto",
            },
        },
    },
    {
        "name": "generate_github_actions",
        "description": "Generate a GitHub Actions YAML workflow from a parsed CI/CD configuration.",
        "function": generate_github_actions,
        "parameters": {
            "parsed_config": {"type": "object", "description": "The parsed configuration dictionary"},
            "source_type": {"type": "string", "description": "The source CI/CD system type"},
        },
    },
    {
        "name": "validate_github_actions",
        "description": "Validate GitHub Actions YAML for syntax errors and common issues.",
        "function": validate_github_actions,
        "parameters": {
            "yaml_content": {"type": "string", "description": "The GitHub Actions YAML string to validate"}
        },
    },
]
