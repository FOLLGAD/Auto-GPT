import datetime
from functools import wraps
import json
import logging
import time
import traceback
from uuid import uuid4
from autogpt.commands.command import CommandRegistry
from autogpt.config.ai_config import AIConfig
import autogpt.llm.chat as chat
from autogpt.config import Config
import os
from openai.error import OpenAIError
import firebase_admin
from firebase_admin import auth as firebase_auth
from autogpt.llm import create_chat_completion
from autogpt.api_log import (
    CRITICAL,
    ERROR,
    WARNING,
    print_log,
)
from autogpt.api_utils import (
    generate_task_name,
    get_file_urls,
)
import logging
from autogpt.agent.agent import Agent

from autogpt.config import Config
from autogpt.logs import logger
from autogpt.memory import get_memory
from autogpt.memory.pinecone import PineconeMemory
from google.cloud import datastore, firestore, logging

from autogpt.prompts.prompt import build_default_prompt_generator, construct_main_ai_config

fireclient = firestore.Client()
client = datastore.Client()
logging_client = logging.Client()

global_config = Config()

START = "###start###"

command_registry = CommandRegistry()

command_categories = [
    # "autogpt.commands.analyze_code",
    # "autogpt.commands.audio_text",
    # "autogpt.commands.execute_code",
    # "autogpt.commands.file_operations",
    "autogpt.commands.firestore_operations",
    # "autogpt.commands.git_operations",
    "autogpt.commands.google_search",
    # "autogpt.commands.image_gen",
    # "autogpt.commands.improve_code",
    # "autogpt.commands.twitter",
    # "autogpt.commands.web_selenium",
    # "autogpt.commands.write_tests",
    "autogpt.app",
    "autogpt.commands.task_statuses",
]


def new_interact(
    cfg: Config,
    ai_config: AIConfig,
    memory: PineconeMemory,
    command_name: str,
    arguments: str,
    assistant_reply: str,
    agent_id: str,
    full_message_history=[],
):
    key = client.key("Agent", agent_id)

    logger.set_level("INFO")
    # print(prompt)
    # Initialize variables
    next_action_count = 0
    # Make a constant:
    triggering_prompt = (
        "Determine which next command to use, and respond using the"
        " format specified above:"
    )
    # Initialize memory and make sure it is empty.
    # this is particularly important for indexing and referencing pinecone memory

    # limit to 100 entries
    full_message_history = full_message_history[-100:]
    for command_category in command_categories:
        command_registry.import_commands(command_category)

    ai_config.command_registry = command_registry

    prompt_generator = build_default_prompt_generator()
    system_prompt = ai_config.construct_full_prompt(prompt_generator)

    agent = fireclient.collection("Agent").document(agent_id).get()
    try:
        summary = agent.get("summary") or None
    except Exception as e:
        summary = None

    # get agent.agents
    agents = {}
    try:
        a = agent.get("agents") or {}
        if type(a) == str:
            agents = json.loads(a)
        else:
            agents = a
    except Exception as e:
        print("AGENT ERROR:", e)
        pass

    agent = Agent(
        ai_name=ai_config.ai_name,
        ai_role=ai_config.ai_role,
        ai_goals=ai_config.ai_goals,
        agent_id=agent_id,
        full_message_history=full_message_history,
        command_name=command_name,
        arguments=arguments,
        assistant_reply=assistant_reply,
        agents=agents,
        triggering_prompt=triggering_prompt,
        system_prompt=system_prompt,
        memory=memory,
        next_action_count=next_action_count,
        cfg=cfg,
        command_registry=command_registry,
        config=ai_config,
        prompt_generator=prompt_generator,
        summary_memory=summary,
    )

    (
        command_name,
        arguments,
        thoughts,
        full_message_history,
        assistant_reply,
        result,
    ) = agent.single_step(
        command_name=command_name,
        arguments=arguments,
    )

    # generate simplified task name
    task_name = generate_task_name(cfg, command_name, arguments)

    try:
        entity = datastore.Entity(
            key=key,
            exclude_from_indexes=(
                "full_message_history",
                "agents",
                "assistant_reply",
                "thoughts",
                "arguments",
                "command_name",
                "tasks",
                "ai_role",
                "ai_goals",
            ),
        )

        prev = client.get(key) or {}
        tasks = prev.get("tasks", [])
        # update the result for the last task, if it exists
        if len(tasks) > 0:
            lastTask: datastore.Entity = tasks[-1]
            lastTask.update({"result": result})

        task = datastore.Entity(exclude_from_indexes=("result", "arguments"))
        task.update(
            {
                "command_name": command_name,
                "arguments": json.dumps(arguments),
                "result": None,
                "task_name": task_name,
                "relevant_goal": thoughts.get("relevant_goal", None),
            }
        )
        tasks.append(task)

        entity.update(
            {
                "ai_name": agent.ai_name,
                "ai_role": agent.ai_role,
                "ai_goals": agent.ai_goals,
                "agent_id": agent.agent_id,
                "full_message_history": json.dumps(agent.full_message_history),
                "command_name": agent.command_name,
                "arguments": json.dumps(agent.arguments),
                "assistant_reply": json.dumps(agent.assistant_reply),
                "thoughts": json.dumps(thoughts),
                "agents": json.dumps(agent.agent_manager.agents),
                "tasks": tasks,
            }
        )
        client.put(entity)
    except Exception as e:
        print_log("Datastore error", severity=WARNING, errorMsg=e, key=str(key))
        raise e

    return (
        command_name,
        arguments,
        thoughts,
        full_message_history,
        assistant_reply,
        result,
        task_name,
    )


# make an api using flask

from flask import Flask, jsonify, request


class LogRequestDurationMiddleware:
    def __init__(self, app):
        self.app = app

    def __call__(self, environ, start_response):
        request_start_time = time.time()
        response = self.app(environ, start_response)
        request_duration = time.time() - request_start_time
        app.logger.info(f"Request duration: {request_duration}")
        return response


from flask_limiter import Limiter

app = Flask(__name__)


def get_remote_address() -> str:
    return (
        request.environ.get("HTTP_X_FORWARDED_FOR")
        or request.environ.get("REMOTE_ADDR")
        or request.remote_addr
    )  # type: ignore


if global_config.redis_host is None:
    print("No redis host, using local limiter")
    limiter = Limiter(app=app, key_func=get_remote_address)
else:
    limiter = Limiter(
        app=app,
        key_func=get_remote_address,
        storage_uri=f"redis://{global_config.redis_host}:{global_config.redis_port}",
    )

app.wsgi_app = LogRequestDurationMiddleware(app.wsgi_app)


@app.after_request
def after_request(response):
    ip = get_remote_address()
    openai_key = "None"
    try:
        if request.json is not None:
            openai_key = request.json["openai_key"]
            openai_key = openai_key[:5] + "..." + openai_key[-5:]
    except Exception as e:
        pass
    # check if request has user
    if hasattr(request, "user"):
        print(
            f"{request.method} {request.path} {response.status_code}: IP {ip} from user {request.user} with key {openai_key}"
        )
    else:
        print(
            f"{request.method} {request.path} {response.status_code}: IP {ip} with no user with key {openai_key}"
        )
    white_origin = ["http://localhost:3000"]
    # if request.headers['Origin'] in white_origin:
    if True:
        response.headers["Access-Control-Allow-Origin"] = request.headers.get(
            "Origin", ""
        )
        response.headers["Access-Control-Allow-Methods"] = "PUT,GET,POST,DELETE"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
    return response


@app.route("/health", methods=["GET"])
def health():
    return "OK"


def make_rate_limit(rate: str):
    def get_rate_limit():
        request_data = request.get_json()
        if (
            request_data.get("openai_key", None) is not None
            and len(request_data.get("openai_key", "")) > 0
        ):
            return "5000 per day;1200 per hour;200 per minute"

        return rate

    return get_rate_limit


firebase_admin.initialize_app()


def verify_firebase_token(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        user = None

        id_token = request.headers.get("Authorization")
        if id_token is not None:
            try:
                # Remove 'Bearer ' from the token if it's present
                if id_token.startswith("Bearer "):
                    id_token = id_token[7:]
                decoded_token = firebase_auth.verify_id_token(id_token)
                user = decoded_token
            except ValueError as e:
                return jsonify({"error": "Unauthorized", "message": str(e)}), 401
            except Exception as e:
                print_log("User failed auth", severity=WARNING, errorMsg=e)
                return jsonify({"error": "Unauthorized", "message": str(e)}), 401

        openai_key = None
        try:
            request_data = request.get_json()
            if (
                request_data.get("openai_key", None) is not None
                and len(request_data.get("openai_key", "")) > 0
            ):
                openai_key = request_data.get("openai_key", None)
        except Exception as e:
            pass

        if user:
            request.user = user

        if not user and not openai_key:
            return (
                jsonify(
                    {
                        "error": "Unauthorized",
                        "message": "Please login or set an API key to continue",
                    }
                ),
                401,
            )

        return f(*args, **kwargs)

    return wrapper


@app.route("/api-goal-subgoals", methods=["POST"])  # type: ignore
@limiter.limit(make_rate_limit("100 per day;60 per hour;15 per minute"))
@verify_firebase_token
def subgoals():
    request_data = request.get_json()

    goal = request_data["goal"]
    cfg = Config()
    cfg.openai_api_key = request_data.get("openai_key", None)

    subgoals = []
    try:
        subgoals = create_chat_completion(
            [
                chat.create_chat_message(
                    "system",
                    "You are ChatGPT, a large language model trained by OpenAI.\nKnowledge cutoff: 2021-09\nCurrent date: 2023-03-26",
                ),
                chat.create_chat_message(
                    "user",
                    f'Make a list of 3 subtasks to the overall goal of: "{goal}".\n'
                    + "\n"
                    + "ONLY answer this message with a numbered list of short, standalone subtasks. write nothing else. Make sure to make the subtask descriptions as brief as possible.",
                ),
            ],
            model="gpt-4o-mini",
            temperature=0.2,
            max_tokens=150,
            cfg=cfg,
        )
    except Exception as e:
        if isinstance(e, OpenAIError):
            print_log("OpenAI error", severity=WARNING, errorMsg=e)
            return e.error, 503

        print_log("/api-goal-subgoals", severity=ERROR, errorMsg=e)

    return json.dumps(
        {
            "subgoals": subgoals,
        }
    )


@app.route("/api", methods=["POST"])  # type: ignore
@limiter.limit(make_rate_limit("500 per day;200 per hour;8 per minute"))
@verify_firebase_token
def godmode_main():
    try:
        request_data = request.get_json()

        command_name = request_data["command"]
        arguments = request_data["arguments"]
        assistant_reply = request_data.get("assistant_reply", "")

        ai_name = request_data["ai_name"]
        ai_description = request_data["ai_description"]
        ai_goals = request_data["ai_goals"]
        message_history = request_data.get("message_history", [])

        try:
            rga = request_data.get("rga", None)
            logger = logging_client.logger('rga-logger') 
            extra_info = {"has_rga": rga}
            logger.log_struct(info=extra_info, severity='INFO')
        except Exception as e:
            print_log("RGA logging failed", severity=WARNING, errorMsg=e)

        agent_id = request_data["agent_id"]

        if hasattr(request, "user"):
            try:
                shortened_desc = ai_description[:1200]
                users_agent = datastore.Entity(
                    key=client.key(
                        "User", request.user.get("user_id"), "Agents", agent_id
                    ),
                )
                users_agent.update(
                    {
                        "created": datetime.datetime.now(),
                        "agent_id": agent_id,
                        "ai_name": ai_name,
                        "ai_role": shortened_desc,
                    }
                )
                client.put(users_agent)
            except Exception as e:
                print_log("User entity failed", severity=WARNING, errorMsg=e)

        openai_key = request_data.get("openai_key", None)
        gpt_model = "gpt-4o-mini"
        if len(openai_key or "") > 0:
            gpt_model = request_data.get("gpt_model", "gpt-4o-mini")
        else:
            gpt_model = "gpt-4o-mini"

        cfg = Config()
        cfg.openai_api_key = openai_key
        cfg.fast_llm_model = gpt_model
        cfg.smart_llm_model = gpt_model
        cfg.agent_id = agent_id

        memory: PineconeMemory = get_memory(cfg)  # type: ignore

        ai_config = AIConfig(
            ai_name=ai_name,
            ai_role=ai_description,
            ai_goals=ai_goals,
        )

        (
            command_name,
            arguments,
            thoughts,
            message_history,
            assistant_reply,
            result,
            task,
        ) = new_interact(
            cfg=cfg,
            ai_config=ai_config,
            memory=memory,
            command_name=command_name,
            arguments=arguments,
            assistant_reply=assistant_reply,
            agent_id=agent_id,
            full_message_history=message_history,
        )
    except Exception as e:
        if isinstance(e, OpenAIError):
            print_log("OpenAI error", severity=WARNING, errorMsg=e)
            # print trace
            traceback.print_exc()
            return e.error, 503

        print_log("/api error", severity=ERROR, errorMsg=e)
        raise e

    return json.dumps(
        {
            "command": command_name,
            "arguments": arguments,
            "thoughts": thoughts,
            "message_history": message_history,
            "assistant_reply": assistant_reply,
            "result": result,
            "task": task,
        }
    )


@app.route("/api/files", methods=["POST"])  # type: ignore
@limiter.limit("32 per minute")
# @verify_firebase_token
def api_files():
    try:
        request_data = request.get_json()
        agent_id = request_data["agent_id"]

        files = get_file_urls(agent_id)
        return files
    except Exception as e:
        print_log("/api/files error", severity=ERROR, errorMsg=e)
        raise e

def convert_none_or_date_to_isoformat(obj):
    if obj is None:
        return None
    if isinstance(obj, datetime.datetime):
        return obj.isoformat()
    return None

@app.route("/api/sessions", methods=["POST"])  # type: ignore
@limiter.limit("16 per minute")
@verify_firebase_token
def sessions():
    try:
        ref = (
            fireclient.collection("User")
            .document(request.user.get("user_id"))
            .collection("Agents")
            .where("ai_name", "!=", "deleted")
        )
        docs = ref.stream()
        results = []
        for doc in docs:
            agent = doc.to_dict()
            agent["agent_id"] = doc.id
            results.append(agent)

        return json.dumps(
            {
                "sessions": [
                    {
                        "agent_id": r.get("agent_id", ""),
                        "ai_name": r.get("ai_name", ""),
                        "ai_role": r.get("ai_role", ""),
                        "created": convert_none_or_date_to_isoformat(r.get("created", None)),
                    }
                    for r in results
                ],
            }, default=str
        )

    except Exception as e:
        print_log("Sessions error", severity=ERROR, errorMsg=e)
        raise e


@app.route("/api/sessions/<agent_id>", methods=["GET"])  # type: ignore
@limiter.limit("16 per minute")
@verify_firebase_token
def session(agent_id):
    try:
        ancestor_key = client.key("Agent", agent_id)
        entity = client.get(key=ancestor_key)
        if entity is None:
            return json.dumps(
                {
                    "session": None,
                }
            )

        entity["arguments"] = (
            json.loads(entity["arguments"])
            if type(entity["arguments"]) == str
            else entity["arguments"]
        )

        return json.dumps(
            {
                "session": entity,
            }
        )

    except Exception as e:
        print_log("Session error", severity=ERROR, errorMsg=e)
        raise e


@app.route("/api/sessions/<agent_id>", methods=["DELETE"])  # type: ignore
@limiter.limit("16 per minute")
@verify_firebase_token
def delete_session(agent_id):
    try:
        useragent_key = client.key(
            "User", request.user.get("user_id"), "Agents", agent_id
        )

        current_agent = client.get(key=useragent_key) or {}
        users_agent = datastore.Entity(key=useragent_key)
        users_agent.update(
            {
                **current_agent,
                "deleted": datetime.datetime.now(),
                "ai_name": "deleted",  # workaround since datastore can't query for lack of a property https://stackoverflow.com/a/44187921/6912118
            }
        )
        client.put(users_agent)

        return json.dumps({})

    except Exception as e:
        print_log("Session error", severity=ERROR, errorMsg=e)
        raise e


# register a 500 error handler
@app.errorhandler(500)
def internal_error(error):
    err_uuid = str(uuid4())
    print_log("500 error", severity=ERROR, errorMsg=error, error_id=err_uuid)
    return f"There was an error. Error ID: {err_uuid}", 500


port = os.environ.get("PORT") or 5100
host = os.environ.get("HOST") or None

if __name__ == "__main__":
    print("Starting API on port", port, "and host", host)
    app.run(debug=True, port=port, host=host)
