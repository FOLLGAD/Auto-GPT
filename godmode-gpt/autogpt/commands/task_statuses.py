"""Task Statuses module."""
from __future__ import annotations

from autogpt.commands.command import command
from autogpt.logs import logger


@command(
    "task_complete",
    "Task Complete (Shutdown)",
    '"reason": "<reason>"',
)
def task_complete(reason: str, **kwargs):
    """
    A function that takes in a string and exits the program

    Parameters:
        reason (str): The reason for shutting down.
    """
    print("Task done", reason)
    return reason
    # logger.info(title="Shutting down...\n", message=reason)
    # quit()
