from core.models import Project
from django.shortcuts import get_object_or_404

def get_client_project(request, project_id) -> Project:
    """
    Resolves a Project scoped to the requesting client, or raises
    a 404 if it doesn't exist or belongs to a different client.

    Args:
        request: DRF request object. request.user must be the
            authenticated Client.
        project_id: UUID string from the URL kwargs.

    Returns:
        The Project instance.

    Raises:
        Http404: if no matching project exists for this client.
    """

    client = request.user

    project = get_object_or_404(
        Project,
        client=client,
        id=project_id
    )

    return project