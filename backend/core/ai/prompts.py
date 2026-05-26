UNIBOT_SYSTEM_PROMPT = """Sos UniBot, asistente académico universitario argentino. Respondé siempre en español, de forma concisa y directa.
Tenés acceso a los datos académicos reales del estudiante que se muestran abajo.
Cuando el usuario pida un plan de estudio, usá los IDs reales de sus materias y eventos.
Cada sesión del plan debe tener una descripción detallada de qué estudiar específicamente ese día."""

FLASHCARD_GENERATION_PROMPT = """Analizá el siguiente texto y generá {count} flashcards de estudio.
Respondé ÚNICAMENTE con JSON válido, sin texto adicional ni markdown:

{{"flashcards": [{{"question": "pregunta clara y específica", "answer": "respuesta concisa y completa", "difficulty": 3}}]}}

Texto:
{text}"""

STUDY_PLAN_PROMPT = """Generá un plan de estudio DETALLADO para:
Materia: {subject}
Fecha del examen: {exam_date}
Días disponibles: {days_available}
Horas por día: {hours_per_day}
Contenido disponible: {topics}

IMPORTANTE: Cada ítem debe tener una descripción DETALLADA de 2-3 oraciones explicando:
1. Qué temas específicos se estudian ese día
2. Qué ejercicios o actividades realizar
3. En qué enfocarse para el examen

Respondé ÚNICAMENTE con JSON válido sin markdown:
{"title": "título del plan", "reasoning": "por qué este orden tiene sentido pedagógicamente", "items": [{"title": "tema corto", "description": "Descripción detallada de 2-3 oraciones. Incluye qué subtemas cubrir, qué ejercicios hacer y cómo conecta con el examen. Ejemplo: Estudiar límites y continuidad, enfocándose en técnicas de L'Hôpital y análisis de discontinuidades. Resolver ejercicios del tipo que suelen aparecer en parciales. Repasar teoremas fundamentales y sus condiciones de aplicación.", "scheduled_date": "YYYY-MM-DD", "duration_minutes": 90, "order": 1}]}"""

EXAM_GENERATION_PROMPT = """Sos un profesor universitario experto en crear exámenes parciales originales y desafiantes.

CONTEXTO DE LA MATERIA (fragmentos de apuntes y documentos del estudiante):
{context}

INSTRUCCIONES ESTRICTAS:
1. NO copies ni repitas literalmente ejercicios, preguntas o problemas del contexto. Creá todo ORIGINAL.
2. La dificultad debe ser: {difficulty} ({difficulty_desc}).
3. El tipo de examen solicitado es: {exam_type} ({exam_type_desc}). Respetá esto al 100%.
4. Generá {count} preguntas variadas.
5. Cada pregunta debe evaluar comprensión profunda, no memorización mecánica.
6. Incluí la respuesta correcta y una explicación pedagógica detallada.
7. CRÍTICO: Respondé EXCLUSIVAMENTE con un JSON válido. Si usás fórmulas matemáticas o LaTeX, DEBÉS escapar las barras invertidas (ejemplo: "\\\\frac{{1}}{{2}}" en lugar de "\\frac{{1}}{{2}}"). No uses saltos de línea literales, usá "\\n".

TIPOS DE EXAMEN:
- teoria: Definiciones, demostraciones, conceptos fundamentales, interpretación teórica, postulados, teoremas. Ideal para materias conceptuales o la parte teórica de cualquier materia.
- practica: Problemas numéricos, ejercicios de aplicación, cálculos, análisis de datos, resolución paso a paso, situaciones concretas. Ideal para Física, Química, Matemática, Ingeniería, etc.
- mixto: Mitad teórico, mitad práctico. Combiná conceptos con aplicación.

DIFICULTADES:
- fácil: Conceptos fundamentales, aplicación directa, opciones de distracción obvias.
- media: Aplicación de fórmulas combinadas, análisis de relaciones causa-efecto, razonamiento intermedio.
- difícil: Síntesis de varios temas, resolución de problemas complejos, análisis crítico, edge cases.

Respondé ÚNICAMENTE con JSON válido sin markdown:

{{"title": "Parcial de Prueba - {subject}", "difficulty": "{difficulty}", "exam_type": "{exam_type}", "estimated_time_minutes": {time}, "instructions": "Instrucciones claras para el estudiante...", "questions": [{{"id": 1, "type": "multiple_choice", "text": "Enunciado original y bien redactado...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "correct_answer": "B", "explanation": "Explicación didáctica completa...", "topic": "Tema específico"}}, {{"id": 2, "type": "open", "text": "Desarrollá el siguiente problema...", "correct_answer": "Guía de respuesta esperada...", "explanation": "Criterios de evaluación...", "topic": "Otro tema"}}, {{"id": 3, "type": "true_false", "text": "Afirmación...", "correct_answer": true, "explanation": "Justificación...", "topic": "Tema correspondiente"}}]}}"""