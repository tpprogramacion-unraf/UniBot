from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import DocumentSummary, UploadedDocument, Enrollment
from .serializers import DocumentSummarySerializer
from .ai.client import ollama

class DocumentSummaryViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentSummarySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return DocumentSummary.objects.filter(enrollment__user=self.request.user).order_by('-created_at')

    @action(detail=False, methods=['post'])
    def generate(self, request):
        document_ids = request.data.get('document_ids', [])
        enrollment_id = request.data.get('enrollment_id')
        title = request.data.get('title', 'Resumen Generado')

        if not document_ids or not enrollment_id:
            return Response({'error': 'Faltan documentos o enrollment_id'}, status=status.HTTP_400_BAD_REQUEST)

        docs = UploadedDocument.objects.filter(id__in=document_ids, enrollment__user=request.user)
        if not docs.exists():
            return Response({'error': 'Documentos no encontrados'}, status=status.HTTP_404_NOT_FOUND)

        try:
            enrollment = Enrollment.objects.get(id=enrollment_id, user=request.user)
        except Enrollment.DoesNotExist:
            return Response({'error': 'Inscripción no encontrada'}, status=status.HTTP_404_NOT_FOUND)

        # Concatenate text
        combined_text = "\n\n".join([f"--- Archivo: {d.filename} ---\n{d.extracted_text}" for d in docs])
        
        prompt = f"""Sos un tutor académico experto. Generá un resumen completo y estructurado en Markdown para estudiar a partir de los siguientes textos extraídos de documentos.
Usá títulos claros, viñetas, resaltados en negrita para conceptos clave y, si corresponde, cuadros comparativos.

Textos:
{combined_text[:15000]}

Generá el resumen a continuación:"""

        response = ollama.chat([{'role': 'user', 'content': prompt}])
        summary_content = response['message']['content']

        summary = DocumentSummary.objects.create(
            enrollment=enrollment,
            title=title,
            content=summary_content,
            is_generated=True
        )
        summary.documents.set(docs)

        return Response(DocumentSummarySerializer(summary).data, status=status.HTTP_201_CREATED)
