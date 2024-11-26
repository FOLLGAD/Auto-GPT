"""Agent manager for managing GPT agents"""
from __future__ import annotations

from typing import List, Union
from autogpt.api_log import print_log

from autogpt.config.config import Config
from autogpt.llm import Message, create_chat_completion


class AgentManager:
    """Agent manager for managing GPT agents"""

    agents: dict[Union[int, str], tuple[str, list[dict[str, str]], str]]

    def __init__(self, cfg: Config, agents={}):
        self.next_key = len(agents.keys())
        self.cfg = cfg
        self.agents = agents  # key, (task, full_message_history, model)

    # Create new GPT agent
    # TODO: Centralise use of create_chat_completion() to globally enforce token limit

    def create_agent(self, task: str, prompt: str, model: str) -> tuple[int, str]:
        """Create a new agent and return its key

        Args:
            task: The task to perform
            prompt: The prompt to use
            model: The model to use

        Returns:
            The key of the new agent
        """
        messages: List[Message] = [
            {"role": "user", "content": prompt},
        ]
        for plugin in self.cfg.plugins:
            if not plugin.can_handle_pre_instruction():
                continue
            if plugin_messages := plugin.pre_instruction(messages):
                messages.extend(iter(plugin_messages))
        # Start GPT instance
        agent_reply = create_chat_completion(
            model=model,
            messages=messages,
            cfg=self.cfg,
        )

        messages.append({"role": "assistant", "content": agent_reply})

        plugins_reply = ""
        for i, plugin in enumerate(self.cfg.plugins):
            if not plugin.can_handle_on_instruction():
                continue
            if plugin_result := plugin.on_instruction(messages):
                sep = "\n" if i else ""
                plugins_reply = f"{plugins_reply}{sep}{plugin_result}"

        if plugins_reply and plugins_reply != "":
            messages.append({"role": "assistant", "content": plugins_reply})
        key = self.next_key
        # This is done instead of len(agents) to make keys unique even if agents
        # are deleted
        self.next_key += 1

        self.agents[key] = (task, messages, model)

        for plugin in self.cfg.plugins:
            if not plugin.can_handle_post_instruction():
                continue
            agent_reply = plugin.post_instruction(agent_reply)

        return key, agent_reply

    def message_agent(self, key: str | int, message: str) -> str:
        """Send a message to an agent and return its response

        Args:
            key: The key of the agent to message
            message: The message to send to the agent

        Returns:
            The agent's response
        """
        try:
            if key in self.agents:
                task, messages, model = self.agents[key]
            elif int(key) in self.agents:
                task, messages, model = self.agents[int(key)]
            elif str(key) in self.agents:
                task, messages, model = self.agents[str(key)]

            # Add user message to message history before sending to agent
            messages.append({"role": "user", "content": message})

            for plugin in self.cfg.plugins:
                if not plugin.can_handle_pre_instruction():
                    continue
                if plugin_messages := plugin.pre_instruction(messages):
                    for plugin_message in plugin_messages:
                        messages.append(plugin_message)

            # Start GPT instance
            agent_reply = create_chat_completion(
                model=model,
                messages=messages,
                cfg=self.cfg,
            )

            messages.append({"role": "assistant", "content": agent_reply})

            plugins_reply = agent_reply
            for i, plugin in enumerate(self.cfg.plugins):
                if not plugin.can_handle_on_instruction():
                    continue
                if plugin_result := plugin.on_instruction(messages):
                    sep = "\n" if i else ""
                    plugins_reply = f"{plugins_reply}{sep}{plugin_result}"
            # Update full message history
            if plugins_reply and plugins_reply != "":
                messages.append({"role": "assistant", "content": plugins_reply})

            for plugin in self.cfg.plugins:
                if not plugin.can_handle_post_instruction():
                    continue
                agent_reply = plugin.post_instruction(agent_reply)

            return agent_reply
        except Exception as e:
            # print trace
            import traceback, json

            print_log(
                "AGENT ERROR CHAT",
                errorMsg=e,
                agentDict=json.dumps(self.agents),
                key=key,
                trace=traceback.format_exc(),
                severity="ERROR",
            )

            raise e

    def list_agents(self) -> list[tuple[str | int, str]]:
        """Return a list of all agents

        Returns:
            A list of tuples of the form (key, task)
        """

        # Return a list of agent keys and their tasks
        return [(key, task) for key, (task, _, _) in self.agents.items()]

    def delete_agent(self, key: str | int) -> bool:
        """Delete an agent from the agent manager

        Args:
            key: The key of the agent to delete

        Returns:
            True if successful, False otherwise
        """

        try:
            del self.agents[int(key)]
            return True
        except KeyError:
            return False
