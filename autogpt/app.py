""" Command and Control """
import json
from typing import Dict, List, Union

from autogpt.agent_manager import AgentManager
from autogpt.commands.command import CommandRegistry, command
from autogpt.commands.web_requests import scrape_links, scrape_text
from autogpt.config import Config
from autogpt.memory import get_memory
from autogpt.prompts.generator import PromptGenerator
from autogpt.speech import say_text
from autogpt.url_utils.validators import validate_url

global_config = Config()


def is_valid_int(value: str) -> bool:
    """Check if the value is a valid integer

    Args:
        value (str): The value to check

    Returns:
        bool: True if the value is a valid integer, False otherwise
    """
    try:
        int(value)
        return True
    except ValueError:
        return False


def get_command(response_json: Dict):
    """Parse the response and return the command name and arguments

    Args:
        response_json (json): The response from the AI

    Returns:
        tuple: The command name and arguments

    Raises:
        json.decoder.JSONDecodeError: If the response is not valid JSON

        Exception: If any other error occurs
    """
    try:
        if "command" not in response_json:
            return "Error:", "Missing 'command' object in JSON"

        if not isinstance(response_json, dict):
            return "Error:", f"'response_json' object is not dictionary {response_json}"

        command = response_json["command"]
        if not isinstance(command, dict):
            return "Error:", "'command' object is not a dictionary"

        if "name" not in command:
            return "Error:", "Missing 'name' field in 'command' object"

        command_name: str = str(command["name"])

        # Use an empty dictionary if 'args' field is not present in 'command' object
        arguments = command.get("args", {})

        return command_name, arguments
    except json.decoder.JSONDecodeError:
        return "Error:", "Invalid JSON"
    # All other errors, return "Error: + error message"
    except Exception as e:
        return "Error:", str(e)


def map_command_synonyms(command_name: str):
    """Takes the original command name given by the AI, and checks if the
    string matches a list of common/known hallucinations
    """
    synonyms = [
        ("write_file", "write_to_file"),
        ("create_file", "write_to_file"),
        ("search", "google"),
        ("search_google", "google"),
        ("google_search", "google"),
    ]
    for seen_command, actual_command_name in synonyms:
        if command_name.lower() == seen_command:
            return actual_command_name
    return command_name


def execute_command(
    command_registry: CommandRegistry,
    command_name: str,
    arguments,
    prompt: PromptGenerator,
    cfg: Config,
    agent_manager: AgentManager,
):
    """Execute the command and return the result

    Args:
        command_name (str): The name of the command to execute
        arguments (dict): The arguments for the command

    Returns:
        str: The result of the command
    """
    try:
        cmd = command_registry.commands.get(command_name)

        # If the command is found, call it with the provided arguments
        if cmd:
            return cmd(**arguments, cfg=cfg, agent_manager=agent_manager)

        # TODO: Remove commands below after they are moved to the command registry.
        command_name = map_command_synonyms(command_name.lower())

        if command_name == "memory_add":
            return get_memory(global_config).add(arguments["string"])

        # TODO: Change these to take in a file rather than pasted code, if
        # non-file is given, return instructions "Input should be a python
        # filepath, write your code to file and try again
        else:
            for command in prompt.commands:
                if (
                    command_name == command["label"].lower()
                    or command_name == command["name"].lower()
                ):
                    return command["function"](**arguments, cfg=cfg, agent_manager=agent_manager)
            return (
                f"Unknown command '{command_name}'. Please refer to the 'COMMANDS'"
                " list for available commands and only respond in the specified JSON"
                " format."
            )
    except Exception as e:
        return f"Error: {str(e)}"

@command("get_hyperlinks", "Get text summary from a single URL", '"url": "<single url>"')
@validate_url
def get_hyperlinks(url: str, **kwargs) -> Union[str, List[str]]:
    """Return the results of a Google search

    Args:
        url (str): The url to scrape

    Returns:
        str or list: The hyperlinks on the page
    """
    
    return scrape_links(url)


@command(
    "start_agent",
    "Start GPT Agent",
    '"name": "<name>", "task": "<short_task_desc>", "prompt": "<prompt>"',
)
def start_agent(name: str, task: str, prompt: str, cfg: Config, agent_manager: AgentManager, **kwargs) -> str:
    """Start an agent with a given name, task, and prompt

    Args:
        name (str): The name of the agent
        task (str): The task of the agent
        prompt (str): The prompt for the agent
        model (str): The model to use for the agent

    Returns:
        str: The response of the agent
    """
    model = cfg.fast_llm_model
    # Remove underscores from name
    voice_name = name.replace("_", " ")

    first_message = f"""You are {name}.  Respond with: "Acknowledged"."""
    agent_intro = f"{voice_name} here, Reporting for duty!"

    # Create agent
    if global_config.speak_mode:
        say_text(agent_intro, 1)
    key, ack = agent_manager.create_agent(task, first_message, model)

    if global_config.speak_mode:
        say_text(f"Hello {voice_name}. Your task is as follows. {task}.")

    # Assign task (prompt), get response
    agent_response = agent_manager.message_agent(key, prompt)

    return f"Agent {name} created with key {key}. First response: {agent_response}"


@command("message_agent", "Message GPT Agent", '"key": "<key>", "message": "<message>"')
def message_agent(key: str, message: str, agent_manager: AgentManager, **kwargs) -> str:
    """Message an agent with a given key and message"""
    # Check if the key is a valid integer
    if is_valid_int(key):
        agent_response = agent_manager.message_agent(int(key), message)
    else:
        return "Invalid key, must be an integer."

    # Speak response
    if global_config.speak_mode:
        say_text(agent_response, 1)
    return agent_response


@command("list_agents", "List GPT Agents", "")
def list_agents(agent_manager: AgentManager, **kwargs) -> str:
    """List all agents

    Returns:
        str: A list of all agents
    """
    return "List of agents:\n" + "\n".join(
        [str(x[0]) + ": " + x[1] for x in agent_manager.list_agents()]
    )


@command("delete_agent", "Delete GPT Agent", '"key": "<key>"')
def delete_agent(key: str, agent_manager: AgentManager, **kwargs) -> str:
    """Delete an agent with a given key

    Args:
        key (str): The key of the agent to delete

    Returns:
        str: A message indicating whether the agent was deleted or not
    """
    result = agent_manager.delete_agent(key)
    return f"Agent {key} deleted." if result else f"Agent {key} does not exist."
