from rest_framework.views import exception_handler
from rest_framework.exceptions import APIException
from rest_framework.response import Response

from django.conf import settings

from utils.logger import get_logger

logger = get_logger(__name__)

def extract_message(detail):
    """
    Produces a human-readable message from DRF's varying error-detail
    shapes: a plain string, a list of strings, or a dict of
    field -> list[str] (the standard ValidationError shape).
    """
    if isinstance(detail, str):
        return detail
    if isinstance(detail, list) and detail:
        return extract_message(detail[0])
    if isinstance(detail, dict) and detail:
        first_key = next(iter(detail))
        first_msg = extract_message(detail[first_key])
        if first_key == "non_field_errors":
            return first_msg
        return f"{first_key}: {first_msg}"
    return "Request failed"


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    request = context.get("request")
    view = context.get("view")

    if response is None:
        logger.exception(
            "Unhandled exception in %s",
            view.__class__.__name__ if view else "unknown"
        )
        if settings.DEBUG:
            return None
        return Response(
            {"success": False, "message": "Something went wrong. Please try again later.",
             "code": "internal_error", "errors": None},
            status=500,
        )

    if isinstance(response.data, dict) and "detail" in response.data:
        original_detail = response.data["detail"]
    else:
        original_detail = response.data

    message = extract_message(original_detail)

    if isinstance(exc, CUSTOM_EXCEPTIONS):
        response.data = {
            "success": False,
            "message": message,
            "code": getattr(exc, "default_code", "error"),
            "errors": response.data,
        }
        logger.error(
            "Backend dependency failure: %s",
            view.__class__.__name__ if view else "unknown",
            extra={
                "path": request.path if request else None,
                "method": request.method if request else None,
                "user": request.user.id if request and request.user.is_authenticated else None,
            },
        )
    else:
        response.data = {
            "success": False,
            "message": message,
            "code": getattr(exc, "default_code", "error"),
            "errors": response.data,
        }
        logger.info(
            "Client error: %s %s -> %s",
            request.method if request else "UNKNOWN",
            request.path if request else "UNKNOWN",
            response.status_code,
        )

    return response

class ChatbotUnavailable(APIException):
    """
    Used for when there is issue with Groq API call or the llm call fails
    """
    status_code = 503
    default_detail = 'Chatbot temporarily unavailable, try again later.'
    default_code = 'chatbot_unavailable'

class IngestionFail(APIException):
    """
    Used for when uploaded document cannot be successfully ingested into qdrant vector db
    """
    status_code = 503
    default_detail = 'Insufficient storage on disk or unable to store'
    default_code = 'ingestion_fail'

class DeletionFail(APIException):
    """
    Used for when a document's Qdrant vectors or filesystem file
    cannot be successfully removed during perform_destroy().
    """
    status_code = 503
    default_detail = 'Unable to delete document. Please try again later.'
    default_code = 'deletion_fail'

class GroqKeyRequired(APIException):
    """
    Raised by ChatView when a free-tier client has no Groq key
    configured.
    """
    status_code = 400
    default_detail = "This project requires a Groq API key. Add one in your account settings."
    default_code = "groq_key_required"

class GroqKeyInvalid(APIException):
    """
    Raised when a stored Groq key fails to decrypt — most likely
    GROQ_ENCRYPTION_KEY was rotated/changed since the key was saved,
    or the stored value is corrupted. Distinct from GroqKeyRequired
    (no key set) since the client believes they've already configured
    one — telling them to "add a key" would be confusing when they
    already did.
    """
    status_code = 400
    default_detail = "Your Groq API key could not be verified. Please re-add it in your account settings."
    default_code = "groq_key_invalid"

CUSTOM_EXCEPTIONS = (
    ChatbotUnavailable,
    IngestionFail,
    DeletionFail,
    GroqKeyRequired,
    GroqKeyInvalid,
)