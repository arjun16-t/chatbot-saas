from rest_framework.response import Response

from django.conf import settings

def set_refresh_cookie(response: Response, refresh_token) -> Response:
    """
    Attaches the refresh token to the response as an httpOnly cookie.

    Args:
        response: DRF Response object to attach the cookie to.
        refresh_token: RefreshToken instance or raw token string to
            store in the cookie.

    Returns:
        The same Response object, with the refresh_token cookie set.
    """
    response.set_cookie (
        key='refresh_token',
        value=str(refresh_token),
        max_age=7 * 24 * 60 * 60,        # 7 days
        httponly=True,
        samesite='Lax',
        secure= False if settings.DEBUG else True,
    )
    return response