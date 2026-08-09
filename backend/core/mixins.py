class EnvelopeResponseMixin:
    """
    Wraps successful generic-view responses in the standard
    {success, message, data} envelope used by every hand-built
    APIView in this project. Error responses are left alone --
    custom_exception_handler already wraps those on a separate
    path; wrapping here too would double-wrap them.
    """
    success_message = "Request successful"

    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        if response.exception:
            return response
        if isinstance(response.data, dict) and 'success' in response.data:
            return response
        response.data = {
            "success": True,
            "message": self.success_message,
            "data": response.data,
        }
        return response