from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from datetime import date, timedelta
from django.utils import timezone
from .models import (
    Career, Subject, Enrollment, ScheduleSlot, AcademicEvent,
    UploadedDocument, Flashcard, FlashcardReview,
    StudyPlan, StudyPlanItem, AgentSession, ExamSimulation
)
from .serializers import (
    CareerSerializer, SubjectSerializer, EnrollmentSerializer,
    ScheduleSlotSerializer, AcademicEventSerializer,
    UploadedDocumentSerializer, FlashcardSerializer,
    FlashcardReviewSerializer, StudyPlanSerializer,
    StudyPlanItemSerializer, AgentSessionSerializer, AgentSessionLightSerializer,
    ExamSimulationSerializer
)
from .ai.agent import UniBotAgent
from .ai.tasks import process_document


class CareerViewSet(viewsets.ModelViewSet):
    serializer_class = CareerSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Career.objects.filter(user=self.request.user)


class SubjectViewSet(viewsets.ModelViewSet):
    serializer_class = SubjectSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Subject.objects.filter(career__user=self.request.user).select_related('career')
        career_id = self.request.query_params.get('career')
        if career_id:
            qs = qs.filter(career_id=career_id)
        return qs


class EnrollmentViewSet(viewsets.ModelViewSet):
    serializer_class = EnrollmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Enrollment.objects.filter(
            user=self.request.user
        ).select_related('subject__career').prefetch_related('schedule_slots')


class ScheduleSlotViewSet(viewsets.ModelViewSet):
    serializer_class = ScheduleSlotSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ScheduleSlot.objects.filter(
            enrollment__user=self.request.user
        ).select_related('enrollment__subject')


class AcademicEventViewSet(viewsets.ModelViewSet):
    serializer_class = AcademicEventSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return AcademicEvent.objects.filter(
            enrollment__user=self.request.user
        ).select_related('enrollment__subject').order_by('date')

    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        events = self.get_queryset().filter(
            date__gte=date.today(),
            date__lte=date.today() + timedelta(days=30)
        )
        return Response(self.get_serializer(events, many=True).data)

    @action(detail=False, methods=['get'])
    def by_month(self, request):
        year = int(request.query_params.get('year', date.today().year))
        month = int(request.query_params.get('month', date.today().month))
        events = self.get_queryset().filter(date__year=year, date__month=month)
        return Response(self.get_serializer(events, many=True).data)


class UploadedDocumentViewSet(viewsets.ModelViewSet):
    serializer_class = UploadedDocumentSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        return UploadedDocument.objects.filter(enrollment__user=self.request.user)

    def perform_create(self, serializer):
        doc = serializer.save()
        try:
            process_document.delay(str(doc.id))
        except Exception as exc:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Celery no disponible, procesando sincrónicamente: {exc}")
            process_document.run(str(doc.id))


class FlashcardViewSet(viewsets.ModelViewSet):
    serializer_class = FlashcardSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Flashcard.objects.filter(enrollment__user=self.request.user)
        enrollment_id = self.request.query_params.get('enrollment')
        if enrollment_id:
            qs = qs.filter(enrollment_id=enrollment_id)
        return qs

    @action(detail=False, methods=['post'])
    def generate(self, request):
        document_id = request.data.get('document_id')
        count = int(request.data.get('count', 10))
        agent = UniBotAgent(user=request.user)
        result = agent.tools.generate_flashcards(document_id, count)
        return Response(result)


class FlashcardReviewViewSet(viewsets.GenericViewSet):
    serializer_class = FlashcardReviewSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class StudyPlanViewSet(viewsets.ModelViewSet):
    serializer_class = StudyPlanSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return StudyPlan.objects.filter(
            enrollment__user=self.request.user
        ).prefetch_related('items')

    @action(detail=False, methods=['post'])
    def generate(self, request):
        agent = UniBotAgent(user=request.user)
        result = agent.tools.create_study_plan(
            request.data.get('enrollment_id'),
            request.data.get('exam_event_id'),
            int(request.data.get('hours_per_day', 2))
        )
        return Response(result)

    @action(detail=True, methods=['patch'])
    def complete_item(self, request, pk=None):
        item = get_object_or_404(StudyPlanItem, id=request.data.get('item_id'), plan_id=pk)
        item.is_completed = True
        item.completed_at = timezone.now()
        item.save()
        return Response(StudyPlanItemSerializer(item).data)


class AgentChatViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'])
    def chat(self, request):
        message = request.data.get('message')
        session_id = request.data.get('session_id')
        session = None
        is_new_session = False
        if session_id:
            try:
                session = AgentSession.objects.get(id=session_id, user=request.user)
            except AgentSession.DoesNotExist:
                pass
        
        if not session:
            is_new_session = True
            
        agent = UniBotAgent(user=request.user, session=session)
        
        if is_new_session and message and not agent.session.title:
            # Generate a title from the first message (up to 40 chars)
            title = message[:40].strip()
            if len(message) > 40:
                title += '...'
            agent.session.title = title
            agent.session.save(update_fields=['title'])
            
        return Response(agent.chat(message))

    @action(detail=False, methods=['get'])
    def sessions(self, request):
        sessions = AgentSession.objects.filter(user=request.user).order_by('-started_at')
        return Response(AgentSessionLightSerializer(sessions, many=True).data)
        
    @action(detail=True, methods=['get'])
    def session_detail(self, request, pk=None):
        session = get_object_or_404(AgentSession, id=pk, user=request.user)
        return Response(AgentSessionSerializer(session).data)


class ExamSimulationViewSet(viewsets.ModelViewSet):
    serializer_class = ExamSimulationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ExamSimulation.objects.filter(
            enrollment__user=self.request.user
        ).select_related('enrollment__subject').order_by('-created_at')

    @action(detail=False, methods=['post'])
    def generate(self, request):
        document_ids = request.data.get('document_ids', [])
        difficulty = request.data.get('difficulty', 'medium')
        exam_type = request.data.get('exam_type', 'mixed')
        count = min(int(request.data.get('count', 10)), 20)

        if not document_ids:
            return Response({'error': 'Seleccioná al menos un documento.'}, status=status.HTTP_400_BAD_REQUEST)

        agent = UniBotAgent(user=request.user)
        result = agent.tools.generate_exam(
            document_ids=document_ids,
            difficulty=difficulty,
            exam_type=exam_type,
            count=count
        )

        if result.get('error'):
            return Response(result, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response(result, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        exam = self.get_object()
        answers = request.data.get('answers', {})

        if not isinstance(exam.questions, list):
            return Response({'error': 'Examen corrupto.'}, status=status.HTTP_400_BAD_REQUEST)

        correct = 0
        total = len(exam.questions)
        results = []

        for q in exam.questions:
            qid = str(q.get('id'))
            user_ans = answers.get(qid)
            correct_ans = q.get('correct_answer')
            is_correct = False

            if q.get('type') == 'multiple_choice':
                is_correct = str(user_ans).upper().strip() == str(correct_ans).upper().strip()
            elif q.get('type') == 'true_false':
                is_correct = bool(user_ans) == bool(correct_ans)
            else:
                is_correct = None

            if is_correct is True:
                correct += 1

            results.append({
                'id': qid,
                'is_correct': is_correct,
                'your_answer': user_ans,
                'correct_answer': correct_ans,
                'explanation': q.get('explanation', ''),
            })

        autocorrect_total = sum(1 for r in results if r['is_correct'] is not None)
        score = round((correct / autocorrect_total) * 10, 2) if autocorrect_total > 0 else None

        exam.score = score
        exam.completed_at = timezone.now()
        exam.save(update_fields=['score', 'completed_at'])

        return Response({
            'score': score,
            'correct_count': correct,
            'total': total,
            'results': results,
        })