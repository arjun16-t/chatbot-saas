from rest_framework.response import Response
from rest_framework import status

def error_response(
    message: str,
    status_code: int = status.HTTP_400_BAD_REQUEST,
    *,
    errors: dict | None = None,
) -> Response:
    return Response(
        {
            "success": False,
            "message": message,
            "errors": errors or {},
        },
        status=status_code,
    )

def success_response(
    message: str,
    data: dict | None = None,
    status_code: int = 200,
) -> Response:
    return Response(
        {
            "success": True,
            "message": message,
            "data": data or {},
        },
        status=status_code,
    )