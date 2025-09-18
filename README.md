# Telegram Colorland AI Agent

Un agente de inteligencia artificial para Telegram que replica la funcionalidad del workflow de n8n, incluyendo integración con OpenAI y Google Sheets.

## Características

- 🤖 Agente de AI con memoria de conversación
- 📱 Integración completa con Telegram
- 🧠 Modelo GPT-4o-mini de OpenAI
- 📊 Acceso a Google Sheets
- 💾 Sistema de memoria para mantener contexto

## Instalación

1. **Clonar o descargar el proyecto**
   ```bash
   cd telegram-colorland
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   ```bash
   cp env.example .env
   ```
   
   Edita el archivo `.env` con tus credenciales:
   - `TELEGRAM_BOT_TOKEN`: Token de tu bot de Telegram
   - `OPENAI_API_KEY`: API Key de OpenAI
   - `GOOGLE_SHEET_ID`: `19FRUSOxX0tcg6ACbPeVtDx0WDu8ntEhTq-mnXm6fVWQ` (ya configurado)
   - `GOOGLE_SHEET_RANGE`: Rango de celdas a leer (por defecto: `Sheet1!A1:Z100`)

4. **Configuración de Google Sheets**
   - La hoja ya está configurada como pública: [colorland_telegram_chatbot](https://docs.google.com/spreadsheets/d/19FRUSOxX0tcg6ACbPeVtDx0WDu8ntEhTq-mnXm6fVWQ/edit?gid=0#gid=0)
   - No necesitas credenciales adicionales ya que la hoja es accesible públicamente
   - El bot puede leer datos directamente de la hoja

## Uso

### Desarrollo
```bash
npm run dev
```

### Producción
```bash
npm start
```

## Comandos del Bot

- `/start` - Iniciar conversación
- `/help` - Mostrar ayuda
- `/clear` - Limpiar memoria del agente
- `/sheets` - Obtener datos de Google Sheets

## Estructura del Proyecto

```
telegram-colorland/
├── index.js              # Script principal del bot
├── package.json          # Dependencias del proyecto
├── env.example           # Archivo de configuración de ejemplo
├── README.md             # Este archivo
└── credentials.json      # Credenciales de Google (no incluido en git)
```

## Funcionalidades Implementadas

### 1. Telegram Trigger
- Escucha todos los mensajes de Telegram
- Procesa comandos especiales
- Manejo de errores robusto

### 2. AI Agent
- Sistema de prompts configurable
- Integración con OpenAI GPT-4o-mini
- Procesamiento de mensajes de usuario

### 3. OpenAI Chat Model
- Configuración del modelo GPT-4o-mini
- Manejo de tokens y temperatura
- Respuestas contextuales

### 4. Simple Memory
- Buffer de memoria con ventana deslizante
- Mantiene contexto de conversación
- Límite configurable de memoria

### 5. Google Sheets Tool
- Lectura de datos de hojas de cálculo
- Autenticación con OAuth2
- Manejo de errores de API

### 6. Send Message
- Envío de respuestas a Telegram
- Formato de mensajes mejorado
- Soporte para Markdown

## Configuración Avanzada

### Personalizar el Prompt del Agente
Edita la variable `systemPrompt` en el método `processWithAIAgent()`:

```javascript
const systemPrompt = `Tu prompt personalizado aquí...`;
```

### Ajustar la Memoria
Modifica `maxMemorySize` en el constructor:

```javascript
this.maxMemorySize = 20; // Mantener 20 conversaciones
```

### Configurar Google Sheets
Ajusta el rango de celdas en las variables de entorno:

```env
GOOGLE_SHEET_RANGE=MiHoja!A1:F100
```

## Solución de Problemas

### Error de Token de Telegram
- Verifica que el token sea correcto
- Asegúrate de que el bot esté activo en @BotFather

### Error de OpenAI
- Verifica tu API key
- Revisa que tengas créditos disponibles

### Error de Google Sheets
- Verifica el archivo de credenciales
- Asegúrate de que la API esté habilitada
- Verifica el ID de la hoja de cálculo

## Licencia

MIT
