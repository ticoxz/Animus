# Documento de Especificación: Animus (MVP)

## 1. Visión del Producto
**Animus** no es un chatbot reactivo ni una herramienta de productividad tradicional; es un **compañero cognitivo proactivo** (tu segundo cerebro en Telegram). Su objetivo principal es tercerizar la fatiga mental del usuario. No espera comandos; se anticipa cruzando el contexto personal, la agenda, las finanzas y el entorno, interactuando de manera conversacional y empática.

### 1.1. Diferenciador Clave (El Foso Defensivo)
A diferencia de sistemas operativos de IA (Hermes, OpenClaw) que son lienzos en blanco para desarrolladores, este producto tiene **opinión de fábrica**. Está diseñado para el consumidor final: cero configuraciones complejas, onboarding invisible y proactividad desde el día uno a través de interfaces de baja fricción (Telegram).

---

## 2. Arquitectura y Stack Tecnológico (MVP)

La premisa técnica es **separar el motor lógico (LLM) de la base de datos de memoria**. Esto hace que el sistema sea agnóstico al modelo y dueño absoluto del contexto.

* **Frontend/Orquestador:** Next.js (App Router) para gestionar la lógica, los *cron jobs* y las rutas de API.
* **Interfaz de Usuario:** Telegram Bot API (baja fricción, soporte nativo de audio/imágenes, sin las restricciones estrictas de proactividad de WhatsApp para la fase de validación).
* **Motor LLM:** API intercambiable (Claude 3.5 Sonnet / OpenAI / Gemini). El modelo es *stateless*; todo el contexto se inyecta en el *System Prompt* en cada request.
* **Base de Datos (Memoria):** Supabase / PostgreSQL. Almacena el "Grafo de Conocimiento Personal" estructurado y el historial transaccional de gastos.
* **Desarrollo:** Entorno optimizado utilizando herramientas de asistencia de IA (ej. Antigravity de Google para el código base).

---

## 3. El Motor de Proactividad (Core Loop)

El sistema no espera a que el usuario hable. Funciona mediante un embudo de contexto:

1.  **Capa Base (Estructura dura):** Lectura pasiva de eventos de Google Calendar y horarios fijos (ej. hora de despertar, hora de cobro).
2.  **Capa Dinámica (Textura de vida):** Variables en tiempo real (clima actual en la ubicación del usuario, hora del día, preferencias de tono).
3.  **Ejecutor (Cron Job):** Next.js evalúa el cruce de estas capas. Si hay un *match* (ej. faltan 15 min para una reunión + hace frío + es martes), dispara un *prompt* al LLM para que redacte un mensaje contextualizado y se lo envía al usuario por Telegram.

---

## 4. Casos de Uso Core (Módulos del MVP)

Para la primera versión validable, el producto se centrará en tres pilares que cubren trabajo, salud y finanzas personales:

### A. Módulo de Reuniones y Agenda (Contexto Laboral)
* **Pre-Meeting Sync:** El bot lee el calendario. 15-30 minutos antes (según la preferencia aprendida del usuario), envía un mensaje con un resumen de la reunión anterior, el objetivo del *call* y un recordatorio de tono.
* **Daily Wrap-up:** Al final del día, analiza las notas sueltas enviadas por audio y las ordena en prioridades para el día siguiente.

### B. Módulo de Nutrición y Visión (El "Wow Factor")
* **Análisis de Heladera:** El usuario envía una foto de los ingredientes disponibles.
* **Cruce de Objetivos:** El bot, utilizando Vision API, cruza los ingredientes con los macros/objetivos de entrenamiento del usuario (ej. rutinas de hipertrofia). Devuelve una receta exacta, rápida y sin requerir que el usuario piense qué cocinar post-entrenamiento.

### C. Módulo de Micro-Finanzas por Chat
* **Ingreso Manual sin Fricción:** El usuario envía audios o textos informales (ej. *"Gasté 50 lucas, pero anotame solo 18 de mi comida y bebida, el resto me lo transfieren"*).
* **Precisión Estricta:** El bot extrae los datos, categoriza el gasto de forma autónoma y respeta estrictamente los montos exactos para divisiones de cuentas, guardando el registro en la base de datos.
* **Proactividad Financiera:** Avisos automáticos el último día hábil del mes (día de cobro) para separar presupuestos (ej. ahorro para mudanzas, capital para proyectos de agencias/estudios) y notificaciones de saldo disponible para ocio el fin de semana.

---

## 5. El Grafo de Conocimiento Personal (Sistema de Memoria)

El *onboarding* es invisible. El sistema utiliza las conversaciones diarias para poblar y actualizar continuamente un perfil estructurado, utilizando un LLM como extractor de entidades.

**Estructura del Perfil Inyectado (System Prompt Base):**
1.  **Información demográfica:** Nombres, seudónimos profesionales, edad, residencia.
2.  **Intereses y preferencias:** Facetas mantenidas en el tiempo (géneros de producción musical, preferencias de hardware de DJ, rutinas en clubes de entrenamiento, cortes de pelo).
3.  **Relaciones:** Familiares (madre, hermana), socios comerciales, amigos cercanos.
4.  **Eventos, proyectos y planes con fecha:** Lanzamientos de software (extensiones de Chrome, gestores musicales), viajes planificados, mudanzas a otros países.
5.  **Instrucciones:** Reglas duras y correcciones (ej. "Antigravity es el editor de Google, no un gestor de proyectos", "avísame de las reuniones 30 minutos antes, no 5").

*Nota Técnica:* Si el usuario cambia de LLM en el futuro, este documento de texto completo se transfiere al nuevo modelo, manteniendo la memoria vital intacta y garantizando que el usuario nunca empiece desde cero.

---

## 6. Roadmap de Lanzamiento y Validación

* **Fase 1: Alpha Interna (Semanas 1-4):** Desarrollo del orquestador en Next.js, integración de Telegram y seteo de la base de datos para el perfil estructurado. Pruebas de ingesta pasiva de memoria.
* **Fase 2: Beta Cerrada "Fase B" (Mes 2):** 20 usuarios iniciales. Foco exclusivo en la validación del módulo de reuniones (Google Calendar) y extracción de gastos por audio. Ajuste fino de la latencia y el tono del bot.
* **Fase 3: Expansión de Módulos (Mes 3-4):** Integración de Vision API para el módulo de la heladera/nutrición. Implementación estricta de *quiet hours* para evitar la fatiga de notificaciones.
* **Fase 4: Escalamiento (Mes 5+):** Transición a WhatsApp API (cuando el LTV del usuario justifique el costo de plantillas proactivas) y monetización en tiers (Free limitado por *rate limits* de Vision, Pro con proactividad ilimitada).