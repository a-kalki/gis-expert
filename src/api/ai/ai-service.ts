import { promises as fs } from 'fs';
import { resolve } from 'path';

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
};

export interface ChatSession {
  userId: string;
  messages: ChatMessage[];
  lastActivity: number;
}

export abstract class AIService {
  protected systemPrompt = '';
  protected aiContext = '';
  private sessions: Map<string, ChatSession>;
  private readonly SESSION_TIMEOUT_MS = process.env.AI_SESSION_TIMEOUT_MIN
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
  private getOrCreateSession(userId: string): ChatSession {
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
    // Очистка каждые 30 минут
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

    // Ограничиваем историю (оставляем самые последние сообщения)
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

      // Добавляем ответ ассистента в историю после успешной генерации
      session.messages.push({
        role: 'assistant',
        content: fullResponse,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('AI: Ошибка генерации ответа:', error);
      const errorMessage = 'Извините, произошла ошибка. Попробуйте позже.';
      yield errorMessage;
      
      // Также добавляем ошибку в историю для контекста
      session.messages.push({
        role: 'assistant',
        content: errorMessage,
        timestamp: Date.now()
      });
    }
  }

  // Внутренний метод для генерации ответа (реализуется в дочерних классах)
  protected abstract generateResponse(userMessage: string, history: ChatMessage[]): AsyncGenerator<string>;

  // Вспомогательный метод для построения промпта
  protected buildPrompt(userMessage: string, history: ChatMessage[]): string {
      // Базовый системный промпт + контекст курса
      let prompt = `${this.systemPrompt}\n\nКОНТЕКСТ КУРСА:\n${this.aiContext}\n\n`;

      // Анализируем контекст диалога
      const shouldRedirect = this.shouldRedirectToHuman(history);
      const isTechnical = this.isTechnicalQuestion(history);
      const hasDetailedQuestions = this.hasDetailedQuestions(history);
      const userIsReady = this.userExpressedReadiness(history);
      const topicsDiscussed = this.getDiscussedTopics(history);

      // Добавляем контекст диалога для ИИ
      prompt += `АНАЛИЗ ДИАЛОГА:\n`;
      prompt += `- Тип вопроса: ${isTechnical ? 'технический' : 'общий'}\n`;
      prompt += `- Требует перенаправления: ${shouldRedirect ? 'ДА' : 'нет'}\n`;
      prompt += `- Подробных вопросов: ${hasDetailedQuestions ? 'много' : 'мало'}\n`;
      prompt += `- Пользователь готов: ${userIsReady ? 'да' : 'нет'}\n`;
      prompt += `- Обсуждаемые темы: ${topicsDiscussed.join(', ') || 'еще не обсуждались'}\n\n`;

      // Добавляем инструкции на основе анализа
      if (shouldRedirect) {
          prompt += `ВАЖНО: Этот вопрос требует перенаправления к Нурболату. \n`;
          prompt += `Дай общий ответ, но обязательно предложи личную консультацию.\n\n`;
      }

      if (isTechnical) {
          prompt += `Это технический вопрос - отвечай уверенно от первого лица.\n\n`;
      }

      // Добавляем историю диалога
      if (history.length > 1) {
          const relevantHistory = history.slice(0, -1);
          prompt += "ПРЕДЫДУЩИЙ ДИАЛОГ:\n";
          relevantHistory.forEach((msg, index) => {
              const role = msg.role === 'user' ? 'СТУДЕНТ' : 'НАСТАВНИК';
              prompt += `${role}: ${msg.content}\n`;
          });
          prompt += "\n";
      }

      prompt += `ТЕКУЩИЙ ВОПРОС СТУДЕНТА: ${userMessage}`;
      
      return prompt;
  }

  // Вспомогательные методы для анализа диалога
  private hasDetailedQuestions(history: ChatMessage[]): boolean {
      const userMessages = history.filter(msg => msg.role === 'user');
      const detailedKeywords = ['подробн', 'детал', 'модул', 'программ', 'содержан', 'изучат'];
      
      return userMessages.some(msg => 
          detailedKeywords.some(keyword => msg.content.toLowerCase().includes(keyword))
      );
  }

  private userExpressedReadiness(history: ChatMessage[]): boolean {
      const userMessages = history.filter(msg => msg.role === 'user');
      const readinessKeywords = ['запис', 'готов', 'начат', 'присоединит', 'давайте'];
      
      return userMessages.some(msg => 
          readinessKeywords.some(keyword => msg.content.toLowerCase().includes(keyword))
      );
  }

  private getDiscussedTopics(history: ChatMessage[]): string[] {
      const topics = new Set<string>();
      const topicKeywords = {
          'языки': ['язык', 'python', 'javascript', 'typescript', 'js', 'ts'],
          'стоимость': ['стоим', 'цена', 'деньги', 'тенге', 'бесплатн'],
          'формат': ['формат', 'онлайн', 'оффлайн', 'заняти', 'урок'],
          'программа': ['программ', 'модул', 'обучен', 'курс'],
          'ментор': ['ментор', 'преподаватель', 'нұрболат'],
          'трудоустройство': ['работ', 'ваканс', 'трудоустройств', 'карьер']
      };

      history.forEach(msg => {
          const content = msg.content.toLowerCase();
          for (const [topic, keywords] of Object.entries(topicKeywords)) {
              if (keywords.some(keyword => content.includes(keyword))) {
                  topics.add(topic);
              }
          }
      });

      return Array.from(topics);
  }

  private shouldRedirectToHuman(history: ChatMessage[]): boolean {
      const lastUserMessage = history.filter(msg => msg.role === 'user').pop()?.content.toLowerCase() || '';
      
      const redirectKeywords = [
          'бесплатно', 'скидк', 'акци', 'цен', 'стоим', 'деньг', 'оплат',
          'когда начать', 'расписан', 'дата', 'время', 'групп',
          'индивидуальн', 'персональн', 'личн', 'моя ситуац',
          'гаранти', 'обещай', 'точно', 'конкретно'
      ];
      
      return redirectKeywords.some(keyword => lastUserMessage.includes(keyword));
  }

  private isTechnicalQuestion(history: ChatMessage[]): boolean {
      const lastUserMessage = history.filter(msg => msg.role === 'user').pop()?.content.toLowerCase() || '';
      
      const technicalKeywords = [
          'язык', 'python', 'javascript', 'typescript', 'программ', 'код',
          'модул', 'урок', 'задани', 'проект', 'технологи', 'фреймворк',
          'обучен', 'методик', 'практик', 'теори'
      ];
      
      return technicalKeywords.some(keyword => lastUserMessage.includes(keyword));
  }

  // Метод для сброса истории (по желанию)
  resetSession(userId: string): boolean {
    return this.sessions.delete(userId);
  }

  // Метод для получения статистики (для мониторинга)
  getSessionStats() {
    return {
      activeSessions: this.sessions.size,
      totalMessages: Array.from(this.sessions.values())
        .reduce((sum, session) => sum + session.messages.length, 0)
    };
  }
}
