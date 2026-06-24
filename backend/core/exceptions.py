from rest_framework.views import exception_handler
from rest_framework.exceptions import APIException
from utils.logger import get_logger

logger = get_logger(__name__)

def custom_exception_handler(exc, context):
    """
    Wrap DRF's default exception handler to enforce a consistent
    error response envelope across the entire API:
        {"success": False, "error": "<human-readable message>"}

    Falls back to DRF's default response for the actual status code
    and detail extraction, then reshapes the body. Unhandled
    (non-DRF) exceptions are not caught here -- they still propagate
    to Django's normal 500 handling, since masking unexpected server
    errors as if they were handled API errors hides real bugs.

    Args:
        exc: the raised exception instance.
        context: dict with 'view', 'request', 'args', 'kwargs' --
            provided by DRF's view machinery.

    Returns:
        Response | None: reshaped Response if DRF's default handler
        recognized the exception, else None (lets it propagate).
    """
    
    response = exception_handler(exc, context)

    request = context.get("request")
    view = context.get("view")

    if response is None:
        logger.exception(
            "Unhandled exception in %s",
            view.__class__.__name__ if view else "unknown"
        )
        return None

    if isinstance(exc, (ChatbotUnavailable, IngestionFail)):
        response.data = {
            "success": False,
            "message": (
                str(exc.detail)
                if isinstance(exc.detail, str)
                else "Request failed"
            ),
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
            "message": (str(exc.detail)
                if not isinstance(exc.detail, (dict, list))
                else "Request failed"),
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