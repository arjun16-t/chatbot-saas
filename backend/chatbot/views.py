from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from core.exceptions import ChatbotUnavailable

from .models import UnansweredQuery
from .serializers import QuerySerializer

from rag.query import query as query_rag
from utils.logger import get_logger

logger = get_logger(__name__)


class ChatView(APIView):
    """
    Authenticated endpoint for querying the RAG pipeline.
    Accepts a question, runs it through the RAG pipeline,
    saves unanswered queries to the database, and returns
    the answer with sources and metadata.
    """

    def post(self, request) -> Response:
        """
        Handles POST /api/chat/
        
        Args:
            request: DRF request object containing question in body.
        
        Returns:
            200 with answer, sources, status and latency on success.
            400 on validation error or empty question.
            500 on pipeline failure.
        """
        serializer = QuerySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        question = serializer.validated_data['question']
        client_id = str(request.user.id)
        # client_id = "temp_123" if settings.DEBUG else str(request.user.id)

        try:
            result = query_rag(question, client_id)
        except Exception as e:
            logger.exception(f'Query Pipeline Failed')
            raise ChatbotUnavailable()
        
        response = {
            "answer": result['answer'],
            "sources": result['used_sources'],
            "status": result['status'],
            "latency_ms": result['metadata']['latency_ms']
        }

        if result['status'] == 'unanswered':
            UnansweredQuery.objects.create(
                client=request.user,
                query=result['query']
            )
            logger.info(f"Unanswered Query: {result['query']} Saved!")
            
        
        logger.info(
            "Query processed",
            extra={
                "query": result["query"],
                "latency_ms": response["latency_ms"],
                "status": result["status"]
            }
        )

        return Response(
            response, status=status.HTTP_200_OK
        )