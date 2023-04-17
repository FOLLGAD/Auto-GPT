"""Git operations for autogpt"""
import git
from autogpt.config import Config
from autogpt.workspace import path_in_workspace

global_config = Config()


def clone_repository(repo_url: str, clone_path: str) -> str:
    """Clone a github repository locally

    Args:
        repo_url (str): The URL of the repository to clone
        clone_path (str): The path to clone the repository to

    Returns:
        str: The result of the clone operation"""
    split_url = repo_url.split("//")
    auth_repo_url = f"//{global_config.github_username}:{global_config.github_api_key}@".join(split_url)
    safe_clone_path = path_in_workspace(clone_path)
    try:
        git.Repo.clone_from(auth_repo_url, safe_clone_path)
        return f"""Cloned {repo_url} to {safe_clone_path}"""
    except Exception as e:
        return f"Error: {str(e)}"
