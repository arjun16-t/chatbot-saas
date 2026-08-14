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
        id=project_id,
        is_deleted=False
    )

    return project

def get_owned_project(request, pk) -> Project:
    """
    Fetches a Project owned by the authenticated client, excluding
    soft-deleted projects. Used by project-level views (rotate,
    revoke, details) that key off `pk` rather than `project_id`.

    Args:
        request: incoming DRF Request, request.user is the Client.
        pk: Project UUID.

    Returns:
        Project instance.

    Raises:
        Http404: no matching, non-deleted project owned by this client.
    """
    return get_object_or_404(
        Project,
        client=request.user,
        pk=pk,
        is_deleted=False
    )