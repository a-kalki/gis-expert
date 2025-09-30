import { promises as fs } from 'fs';
import { resolve } from 'path';

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
};

export interface UserChatSession {
  userId: string;
  messages: ChatMessage[];
  lastActivity: number;
}

export abstract class AIService {
  protected systemPrompt = '';
  protected aiContext = '';
  private sessions: Map<string, UserChatSession>;
  private readonly SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 1 час
  private readonly MAX_HISTORY_LENGTH = 20;

  constructor() {
    this.sessions = new Map();
    this.initialize();
    this.startSessionCleanup();
  }

  private async initialize() {
    const systemPromptPath = resolve(process.cwd(), 'src/api/ai', 'ai-system-prompt.txt');
    const contextPath = resolve(process.cwd(), 'src/api/ai', 'ai-context.txt');

    try {
      const [systemPromptContent, aiContextContent] = await Promise.all([
        fs.readFile(systemPromptPath, 'utf-8'),
        fs.readFile(contextPath, 'utf-8')
      ]);
      
      this.systemPrompt = systemPromptContent;
      this.aiContext = aiContextContent;
      console.log('AI CORE: Системный промпт и контекст успешно загружены.');

    } catch (error) {
      console.error('AI CORE: Ошибка загрузки конфигурации:', error);
      this.systemPrompt = 'Отвечай кратко по предоставленному контексту.';
      this.aiContext = 'Информация о курсе временно недоступна.';
    }
  }

  // Управление сессиями
  private getOrCreateSession(userId: string): UserChatSession {
    let session = this.sessions.get(userId);
    
    if (!session) {
      session = {
        userId,
        messages: [],
        lastActivity: Date.now()
      };
      this.sessions.set(userId, session);
      console.log(`AI: Создана новая сессия для пользователя ${userId}`);
    } else {
      session.lastActivity = Date.now();
    }
    
    return session;
  }

  private cleanupExpiredSessions(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [userId, session] of this.sessions.entries()) {
      if (now - session.lastActivity > this.SESSION_TIMEOUT_MS) {
        this.sessions.delete(userId);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`AI: Очищено ${cleanedCount} неактивных сессий`);
    }
  }

  private startSessionCleanup(): void {
    setInterval(() => this.cleanupExpiredSessions(), 30 * 60 * 1000);
  }

  // Основной метод для обработки сообщений
  async *processMessage(userId: string, userMessage: string): AsyncGenerator<string> {
    console.log(userId, userMessage)
    const session = this.getOrCreateSession(userId);
    
    // Добавляем сообщение пользователя в историю
    session.messages.push({
      role: 'user',
      content: userMessage,
      timestamp: Date.now()
    });

    // Ограничиваем историю
    if (session.messages.length > this.MAX_HISTORY_LENGTH) {
      session.messages = session.messages.slice(-this.MAX_HISTORY_LENGTH);
    }

    // Генерируем ответ
    let fullResponse = '';
    
    try {
      for await (const chunk of this.generateResponse(userMessage, session.messages)) {
        yield chunk;
        fullResponse += chunk;
      }

      // Добавляем ответ ассистента в историю
      session.messages.push({
        role: 'assistant',
        content: fullResponse,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('AI: Ошибка генерации ответа:', error);
      const errorMessage = 'Извините, произошла ошибка. Попробуйте позже.';
      yield errorMessage;
      
      session.messages.push({
        role: 'assistant',
        content: errorMessage,
        timestamp: Date.now()
      });
    }
  }

  // Внутренний метод для генерации ответа
  protected abstract generateResponse(userMessage: string, history: ChatMessage[]): AsyncGenerator<string>;

  // Метод для сброса истории
  resetSession(userId: string): boolean {
    return this.sessions.delete(userId);
  }

  // Метод для получения статистики
  getSessionStats() {
    return {
      activeSessions: this.sessions.size,
      totalMessages: Array.from(this.sessions.values())
        .reduce((sum, session) => sum + session.messages.length, 0)
    };
  }
}
