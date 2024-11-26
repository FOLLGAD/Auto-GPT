from google.cloud import storage
from autogpt.llm import chat
import time

from autogpt.llm import create_chat_completion

private_bucket_name = "godmode-ai"
public_bucket_name = "godmode-public"

client = storage.Client()
private_bucket = client.bucket(private_bucket_name)


def upload_log(text: str, session_id: str):
    timestamp = time.time()
    blob = private_bucket.blob(f"godmode-logs/{session_id}/{int(timestamp * 1000)}.txt")
    blob.upload_from_string(
        text,
        content_type="text/plain",
    )


bucket = client.bucket(public_bucket_name)


def write_file(text: str, filename: str, agent_id: str):
    blob = bucket.blob(f"godmode-files/{agent_id}/{filename}")
    blob.upload_from_string(
        text,
        content_type="text/plain",
    )


def get_file(filename: str, agent_id: str):
    blob = bucket.blob(f"godmode-files/{agent_id}/{filename}")
    try:
        text = blob.download_as_text()
        return text
    except Exception as e:
        return ""


def list_files(agent_id: str):
    prefix = f"godmode-files/{agent_id}/"
    blobs = bucket.list_blobs(prefix=prefix)
    return [file.name.replace(prefix, "") for file in blobs]


def get_file_urls(agent_id: str):
    if len(agent_id) < 5:
        return []
    blobs = client.list_blobs(public_bucket_name, prefix=f"godmode-files/{agent_id}/")
    return [file.public_url for file in blobs]


def generate_task_name(cfg, command_name: str, arguments: str):
    try:
        task_name = create_chat_completion(
            [
                chat.create_chat_message(
                    "system",
                    "You are ChatGPT, a large language model trained by OpenAI.\nKnowledge cutoff: 2021-09\nCurrent date: 2023-03-26",
                ),
                chat.create_chat_message(
                    "user",
                    'Describe this action as succinctly as possible in one short sentence:\n\n```\nCOMMAND: browse_website\nARGS: {\n  "url": "https://www.amazon.com/",\n  "question": "What are the current top products in the Smart Home Device category?"\n}\n```',
                ),
                chat.create_chat_message(
                    "assistant", "Find top Smart Home Device products on Amazon.com."
                ),
                chat.create_chat_message(
                    "user",
                    f"Describe this action as succinctly as possible in one short sentence:\n\n```\nCOMMAND: {command_name}\nARGS: {arguments}\n```",
                ),
            ],
            model="gpt-4o-mini",
            temperature=0.2,
            cfg=cfg,
        )
        return task_name
    except Exception as e:
        print(e)
    return None

