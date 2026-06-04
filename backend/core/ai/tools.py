import json
import logging
import re
from datetime import date
from .client import ollama
from .prompts import FLASHCARD_GENERATION_PROMPT, STUDY_PLAN_PROMPT, EXAM_GENERATION_PROMPT

logger = logging.getLogger(__name__)


class AgentTools:
    def __init__(self, user):
        self.user = user

    def get_calendar(self, **kwargs):
        from ..models import Enrollment, AcademicEvent
        enrollments = Enrollment.objects.filter(user=self.user, status='active')
        events = AcademicEvent.objects.filter(
            enrollment__in=enrollments, date__gte=date.today()
        ).order_by('date').select_related('enrollment__subject')[:20]
        return {'events': [{'id': str(e.id), 'title': e.title, 'type': e.event_type,
                            'subject': e.enrollment.subject.name,
                            'date': e.date.strftime('%Y-%m-%d'),
                            'days_until': (e.date.date() - date.today()).days, 'enrollment_id': str(e.enrollment_id)} for e in events]}

    def get_documents(self, enrollment_id=None, **kwargs):
        from ..models import UploadedDocument
        docs = UploadedDocument.objects.filter(enrollment__user=self.user, status='indexed')
        if enrollment_id:
            docs = docs.filter(enrollment_id=enrollment_id)
        return {'documents': [{'id': str(d.id), 'filename': d.filename, 'pages': d.page_count} for d in docs]}

    def generate_flashcards(self, document_id=None, count=10, **kwargs):
        from ..models import UploadedDocument, Flashcard
        try:
            doc = UploadedDocument.objects.get(id=document_id)
            text = doc.extracted_text[:3000]
            prompt = FLASHCARD_GENERATION_PROMPT.format(count=count, text=text)
            # Aumentamos a 2048 tokens por si genera muchas flashcards
            response = ollama.chat([{'role': 'user', 'content': prompt}], options={'max_tokens': 2048})
            data = json.loads(response['message']['content'])
            created = []
            for fc in data.get('flashcards', []):
                flashcard = Flashcard.objects.create(
                    enrollment=doc.enrollment, source_document=doc,
                    question=fc['question'], answer=fc['answer'],
                    difficulty=fc.get('difficulty', 3), is_ai_generated=True
                )
                created.append({'id': str(flashcard.id), 'question': fc['question']})
            return {'created': len(created), 'flashcards': created}
        except Exception as e:
            return {'error': str(e)}

    def create_study_plan(self, enrollment_id=None, exam_event_id=None, hours_per_day=2, **kwargs):
        from ..models import Enrollment, AcademicEvent, StudyPlan, StudyPlanItem, UploadedDocument
        try:
            enrollment = Enrollment.objects.get(id=enrollment_id, user=self.user)
            event = AcademicEvent.objects.get(id=exam_event_id)
            days_available = (event.date.date() - date.today()).days
            docs = UploadedDocument.objects.filter(enrollment=enrollment, status='indexed')
            combined_text = ' '.join([d.extracted_text[:300] for d in docs])
            prompt = STUDY_PLAN_PROMPT.format(
                subject=enrollment.subject.name, exam_date=event.date.strftime('%Y-%m-%d'),
                days_available=days_available, hours_per_day=hours_per_day, topics=combined_text[:500]
            )
            # Aumentamos a 2048 tokens por si el plan es largo
            response = ollama.chat([{'role': 'user', 'content': prompt}], options={'max_tokens': 2048})
            data = json.loads(response['message']['content'])
            plan = StudyPlan.objects.create(
                enrollment=enrollment, target_event=event, title=data['title'],
                agent_reasoning=data.get('reasoning', ''), generated_by_agent=True
            )
            for item in data.get('items', []):
                StudyPlanItem.objects.create(
                    plan=plan, title=item['title'], description=item.get('description', ''),
                    scheduled_date=item['scheduled_date'],
                    duration_minutes=item.get('duration_minutes', 60), order=item.get('order', 0)
                )
            return {'plan_id': str(plan.id), 'title': plan.title, 'items': len(data.get('items', []))}
        except Exception as e:
            return {'error': str(e)}

    def generate_exam(self, document_ids, difficulty, exam_type='mixed', count=10, **kwargs):
        from ..models import UploadedDocument, ExamSimulation, Enrollment
        try:
            docs = UploadedDocument.objects.filter(
                id__in=document_ids,
                enrollment__user=self.user,
                status='indexed'
            ).select_related('enrollment__subject')

            if not docs.exists():
                return {'error': 'No se encontraron documentos indexados.'}

            enrollment = docs.first().enrollment
            subject_name = enrollment.subject.name

            context_parts = []
            total_chars = 0
            max_chars = 12000
            for d in docs:
                text = (d.extracted_text or '')[:3000]
                if text:
                    context_parts.append(f"--- {d.filename} ---\n{text}")
                    total_chars += len(text)
                if total_chars >= max_chars:
                    break

            context = '\n\n'.join(context_parts) or 'Contenido general de la materia.'

            difficulty_map = {
                'easy': ('fácil', 'Conceptos fundamentales, aplicación directa.', 45),
                'medium': ('media', 'Aplicación combinada, razonamiento intermedio.', 60),
                'hard': ('difícil', 'Síntesis compleja, análisis crítico.', 90),
            }
            diff_label, diff_desc, est_time = difficulty_map.get(difficulty, difficulty_map['medium'])

            type_map = {
                'theory': ('teoria', 'Solo preguntas teóricas: definiciones, demostraciones, conceptos, teoremas.'),
                'practice': ('practica', 'Solo preguntas prácticas: problemas numéricos, ejercicios de aplicación, cálculos, resolución paso a paso.'),
                'mixed': ('mixto', 'Combinación de teoría y práctica.'),
            }
            type_label, type_desc = type_map.get(exam_type, type_map['mixed'])

            prompt = EXAM_GENERATION_PROMPT.format(
                context=context,
                difficulty=diff_label,
                difficulty_desc=diff_desc,
                exam_type=type_label,
                exam_type_desc=type_desc,
                count=count,
                subject=subject_name,
                time=est_time
            )

            # FIX CLAVE: Forzamos 4096 tokens (o más) para evitar que el JSON se corte a la mitad (Unterminated string)
            response = ollama.chat([{'role': 'user', 'content': prompt}], options={'max_tokens': 4096})
            raw = response['message']['content']

            # Limpiamos los bloques de código usando Regex de una forma más segura
            clean = raw.strip()
            if clean.startswith('`' * 3):
                clean = re.sub(r'^`{3}(?:json)?\s*', '', clean)
                clean = re.sub(r'\s*`{3}$', '', clean)
                clean = clean.strip()

            try:
                data = json.loads(clean)
            except json.JSONDecodeError as je:
                try:
                    # FIX: Encontrar barras invertidas que NO estén seguidas por 
                    # un caracter de escape JSON válido y duplicarlas para escapar el LaTeX.
                    fixed = re.sub(r'\\(?![/"\\bfnrt])', r'\\\\', clean)
                    
                    # Limpiamos saltos de línea literales que a veces rompen los strings
                    fixed = fixed.replace('\n', ' ')
                    
                    data = json.loads(fixed)
                except json.JSONDecodeError as inner_je:
                    logger.error(f"[generate_exam] JSON inválido. Raw:\n{raw[:500]}")
                    return {'error': f'La IA no devolvió un JSON válido. Error: {str(inner_je)}'}

            if not isinstance(data, dict):
                return {'error': 'La respuesta de la IA no tiene formato de objeto JSON.'}
            if 'questions' not in data:
                return {'error': 'La respuesta de la IA no contiene preguntas.'}

            exam = ExamSimulation.objects.create(
                enrollment=enrollment,
                title=data.get('title', f'Parcial - {subject_name}'),
                questions=data.get('questions', []),
                score=None,
                completed_at=None
            )

            return {
                'exam_id': str(exam.id),
                'title': exam.title,
                'difficulty': difficulty,
                'exam_type': exam_type,
                'question_count': len(data.get('questions', [])),
                'questions': data.get('questions', []),
                'instructions': data.get('instructions', ''),
                'estimated_time': data.get('estimated_time_minutes', est_time),
            }
        except Exception as e:
            logger.exception(f"[generate_exam] Error inesperado: {e}")
            return {'error': str(e)}

    def execute(self, tool_name, **kwargs):
        tools = {
            'get_calendar': self.get_calendar,
            'get_documents': self.get_documents,
            'generate_flashcards': self.generate_flashcards,
            'create_study_plan': self.create_study_plan,
            'generate_exam': self.generate_exam,
        }
        if tool_name not in tools:
            return {'error': f'Herramienta {tool_name} no existe'}
        return tools[tool_name](**kwargs)