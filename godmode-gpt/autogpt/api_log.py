import json
from flask import request

PROJECT = "consulting-17de1"
# Build structured log messages as an object.
global_log_fields = {}

DEBUG = "DEBUG"
INFO = "INFO"
NOTICE = "NOTICE"
WARNING = "WARNING"
ERROR = "ERROR"
CRITICAL = "CRITICAL"
EMERGENCY = "EMERGENCY"


def print_log(
    msg: str,
    severity="NOTICE",
    errorMsg=None,
    **kwargs,
):
    # Add log correlation to nest all log messages.
    # This is only relevant in HTTP-based contexts, and is ignored elsewhere.
    # (In particular, non-HTTP-based Cloud Functions.)
    errorMsg = str(errorMsg) if errorMsg else None
    request_is_defined = "request" in globals() or "request" in locals()
    if request_is_defined and request:
        trace_header = request.headers.get("X-Cloud-Trace-Context")

        if trace_header and PROJECT:
            trace = trace_header.split("/")
            global_log_fields[
                "logging.googleapis.com/trace"
            ] = f"projects/{PROJECT}/traces/{trace[0]}"

    # Complete a structured log entry.
    entry = dict(
        severity=severity,
        message=msg,
        errorMsg=errorMsg,
        **kwargs,
        **global_log_fields,
    )

    print(json.dumps(entry))
