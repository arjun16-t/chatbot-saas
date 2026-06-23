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
    pass