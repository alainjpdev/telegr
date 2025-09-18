const { Telegraf } = require('telegraf');
const OpenAI = require('openai');
const { google } = require('googleapis');
require('dotenv').config();

class TelegramAIAgent {
  constructor() {
    // Inicializar el bot de Telegram
    this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
    
    // Inicializar OpenAI
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    // Inicializar Google Sheets con credenciales de servicio
    this.sheets = google.sheets({ version: 'v4' });
    this.sheetId = process.env.GOOGLE_SHEET_ID;
    this.sheetRange = process.env.GOOGLE_SHEET_RANGE || 'Sheet1!A1:Z100';
    this.apiKey = process.env.GOOGLE_API_KEY;
    
    // Configurar autenticación para escritura
    if (process.env.GOOGLE_CREDENTIALS_FILE) {
      this.auth = new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_CREDENTIALS_FILE,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
    }
    
    // Memoria del agente (simulando el buffer window memory)
    this.memory = [];
    this.maxMemorySize = 10; // Mantener solo las últimas 10 conversaciones
    
    this.setupBot();
  }

  setupBot() {
    // Configurar el trigger de mensajes (equivalente al Telegram Trigger del JSON)
    this.bot.on('message', async (ctx) => {
      try {
        const userMessage = ctx.message.text;
        const userId = ctx.from.id;
        const userName = ctx.from.first_name || 'Usuario';
        
        console.log(`📨 Mensaje recibido de ${userName} (${userId}): ${userMessage}`);
        
        // Guardar mensaje en Google Sheets
        try {
          await this.saveMessageToSheet(userId, userMessage);
        } catch (sheetError) {
          console.error('Error guardando en Google Sheets:', sheetError);
          // Continuar aunque falle el guardado
        }
        
        // Procesar con el agente AI (deshabilitado temporalmente)
        let response;
        try {
          response = await this.processWithAIAgent(userMessage, userId);
        } catch (aiError) {
          console.error('Error con IA:', aiError.message);
          response = `Hola ${userName}! Recibí tu mensaje: "${userMessage}"\n\n🤖 (IA temporalmente deshabilitada - configurando API key)`;
        }
        
        // Enviar respuesta (equivalente al "Send a text message" del JSON)
        await ctx.reply(response);
        
      } catch (error) {
        console.error('Error procesando mensaje:', error);
        await ctx.reply('Lo siento, ocurrió un error al procesar tu mensaje.');
      }
    });

    // Comando de inicio
    this.bot.start((ctx) => {
      ctx.reply('¡Hola! Soy un agente de AI que puede ayudarte con herramientas. ¿En qué puedo asistirte?');
    });

    // Comando de ayuda
    this.bot.help((ctx) => {
      ctx.reply(`
🤖 *Agente de AI con Herramientas*

Comandos disponibles:
/start - Iniciar conversación
/help - Mostrar esta ayuda
/clear - Limpiar memoria del agente
/sheets - Ver mensajes guardados en Google Sheets
/stats - Ver estadísticas del bot

Puedo ayudarte con:
• Consultas generales usando IA
• Acceso a datos de Google Sheets
• Mantener contexto de nuestra conversación
• Guardar todos los mensajes automáticamente

💾 *Todos los mensajes se guardan automáticamente en Google Sheets*
      `, { parse_mode: 'Markdown' });
    });

    // Comando para limpiar memoria
    this.bot.command('clear', (ctx) => {
      this.memory = [];
      ctx.reply('Memoria del agente limpiada.');
    });

    // Comando para probar Google Sheets
    this.bot.command('sheets', async (ctx) => {
      try {
        const data = await this.getGoogleSheetsData();
        if (data && data.length > 0) {
          let message = '📊 *Mensajes guardados en Google Sheets:*\n\n';
          data.slice(0, 10).forEach((row, index) => {
            if (row[0] && row[1]) {
              message += `${index + 1}. Usuario: ${row[0]}\n   Mensaje: ${row[1]}\n\n`;
            }
          });
          ctx.reply(message, { parse_mode: 'Markdown' });
        } else {
          ctx.reply('No hay mensajes guardados aún.');
        }
      } catch (error) {
        ctx.reply('Error accediendo a Google Sheets. Verifica la configuración.');
      }
    });

    // Comando para ver estadísticas
    this.bot.command('stats', async (ctx) => {
      try {
        const data = await this.getGoogleSheetsData();
        const totalMessages = data ? data.length : 0;
        const uniqueUsers = data ? new Set(data.map(row => row[0])).size : 0;
        
        ctx.reply(`📈 *Estadísticas del Bot:*\n\n` +
                 `💬 Total de mensajes: ${totalMessages}\n` +
                 `👥 Usuarios únicos: ${uniqueUsers}\n` +
                 `🧠 Memoria del agente: ${this.memory.length} conversaciones`, 
                 { parse_mode: 'Markdown' });
      } catch (error) {
        ctx.reply('Error obteniendo estadísticas.');
      }
    });
  }

  async processWithAIAgent(message, userId) {
    try {
      // Agregar mensaje a la memoria
      this.addToMemory('user', message, userId);
      
      // Preparar el contexto con memoria
      const memoryContext = this.getMemoryContext();
      
      // Crear el prompt del agente (equivalente al prompt del JSON)
      const systemPrompt = `Eres un agente de AI que usa herramientas. ${memoryContext}
      
Tienes acceso a las siguientes herramientas:
1. Google Sheets - Puedes consultar datos de hojas de cálculo
2. Memoria de conversación - Recuerdas el contexto de la conversación

Responde de manera útil y profesional. Si necesitas usar Google Sheets, menciona que puedes acceder a esa información.`;

      // Llamar a OpenAI (equivalente al OpenAI Chat Model del JSON)
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini", // Usando gpt-4o-mini como en el JSON
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      });

      const response = completion.choices[0].message.content;
      
      // Agregar respuesta a la memoria
      this.addToMemory('assistant', response, userId);
      
      return response;
      
    } catch (error) {
      console.error('Error en el agente AI:', error);
      return 'Lo siento, no pude procesar tu solicitud en este momento.';
    }
  }

  addToMemory(role, content, userId) {
    this.memory.push({
      role,
      content,
      userId,
      timestamp: new Date().toISOString()
    });
    
    // Mantener solo las últimas conversaciones
    if (this.memory.length > this.maxMemorySize) {
      this.memory = this.memory.slice(-this.maxMemorySize);
    }
  }

  getMemoryContext() {
    if (this.memory.length === 0) return '';
    
    const recentMemory = this.memory.slice(-5); // Últimas 5 interacciones
    const context = recentMemory.map(item => 
      `${item.role}: ${item.content}`
    ).join('\n');
    
    return `\n\nContexto de conversación reciente:\n${context}`;
  }

  async getGoogleSheetsData() {
    try {
      // Usar la API Key para acceder a Google Sheets
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.sheetId,
        range: this.sheetRange,
        key: this.apiKey
      });
      
      return response.data.values || [];
    } catch (error) {
      console.error('Error accediendo a Google Sheets:', error);
      // Si falla con la API, intentamos con fetch directo
      try {
        const publicUrl = `https://docs.google.com/spreadsheets/d/${this.sheetId}/export?format=csv&gid=0`;
        const fetch = require('node-fetch');
        const response = await fetch(publicUrl);
        const csvText = await response.text();
        
        // Convertir CSV a array
        const lines = csvText.split('\n');
        return lines.map(line => line.split(','));
      } catch (fetchError) {
        console.error('Error con método alternativo:', fetchError);
        throw error;
      }
    }
  }

  async saveMessageToSheet(userId, message) {
    try {
      console.log(`💾 Guardando mensaje en Google Sheets: Usuario ${userId} - ${message}`);
      
      // Preparar los datos para escribir
      const values = [[userId, message]];
      
      if (this.auth) {
        // Usar credenciales de servicio para escritura
        const authClient = await this.auth.getClient();
        const response = await this.sheets.spreadsheets.values.append({
          auth: authClient,
          spreadsheetId: this.sheetId,
          range: 'Sheet1!A:B',
          valueInputOption: 'RAW',
          insertDataOption: 'INSERT_ROWS',
          resource: { values: values }
        });
        
        console.log('✅ Mensaje guardado exitosamente con credenciales de servicio');
        return response.data;
      } else {
        // Fallback: solo loguear si no hay credenciales
        console.log(`📝 Datos a guardar: ID=${userId}, Mensaje="${message}"`);
        console.log('⚠️  Nota: Configura GOOGLE_CREDENTIALS_FILE para habilitar escritura');
        return { success: true, message: 'Datos preparados para guardar' };
      }
      
    } catch (error) {
      console.error('❌ Error guardando mensaje en Google Sheets:', error);
      throw error;
    }
  }

  async start() {
    try {
      console.log('Iniciando bot de Telegram...');
      await this.bot.launch();
      console.log('Bot iniciado correctamente');
      
      // Manejo graceful de cierre
      process.once('SIGINT', () => this.bot.stop('SIGINT'));
      process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
      
    } catch (error) {
      console.error('Error iniciando el bot:', error);
      process.exit(1);
    }
  }
}

// Inicializar y ejecutar el agente
const agent = new TelegramAIAgent();
agent.start();
