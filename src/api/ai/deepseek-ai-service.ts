import { AIService, ChatMessage } from './ai-service';

export class DeepSeekService extends AIService {
    private apiUrl: string = 'https://api.deepseek.com/chat/completions';
    private apiKey: string;

    constructor(key: string) {
        super();
        this.apiKey = key;
    }

    protected async *generateResponse(userMessage: string, history: ChatMessage[]): AsyncGenerator<string> {
        try {
            const messages = this.prepareMessages(userMessage, history);
            
            console.log('Sending to DeepSeek:', {
                messagesCount: messages.length,
                historyLength: history.length
            });

            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: messages,
                    stream: true,
                    temperature: 0.8,
                    max_tokens: 1200,
                    top_p: 0.9
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('DeepSeek API error:', errorText);
                throw new Error(`DeepSeek error: ${response.status}`);
            }

            // Правильная обработка стриминга
            yield* this.handleStream(response);

        } catch (error: any) {
            console.error("DEEPSEEK ERROR:", error);
            yield "Извините, сервис временно недоступен. Попробуйте позже.";
        }
    }

    private async *handleStream(response: Response): AsyncGenerator<string> {
        const reader = response.body?.getReader();
        if (!reader) throw new Error('No reader');

        const decoder = new TextDecoder();
        let buffer = '';
        
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                
                // Оставляем последнюю неполную строку в буфере
                buffer = lines.pop() || '';
                
                for (const line of lines) {
                    if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                        try {
                            const data = JSON.parse(line.slice(6));
                            const content = data.choices[0]?.delta?.content;
                            if (content) {
                                yield content;
                            }
                        } catch (e) {
                            // Игнорируем ошибки парсинга некритических данных
                            if (!line.includes('[DONE]')) {
                                console.log('Parse error for line:', line);
                            }
                        }
                    }
                }
            }
            
            // Обрабатываем оставшиеся данные в буфере
            if (buffer.trim() && buffer.startsWith('data: ') && buffer !== 'data: [DONE]') {
                try {
                    const data = JSON.parse(buffer.slice(6));
                    const content = data.choices[0]?.delta?.content;
                    if (content) {
                        yield content;
                    }
                } catch (e) {
                    // Игнорируем ошибки парсинга
                }
            }
            
        } finally {
            reader.releaseLock();
        }
    }

    private prepareMessages(userMessage: string, history: ChatMessage[]) {
        const messages = [];
        
        // 1. Только системный промпт без истории
        messages.push({
            role: 'system',
            content: this.buildSystemPrompt()
        });

        // 2. История диалога как отдельные сообщения (ограничиваем чтобы не превысить лимит токенов)
        const recentHistory = this.getRecentHistory(history, 8); // Последние 8 сообщений
        
        recentHistory.forEach(msg => {
            messages.push({
                role: msg.role,
                content: msg.content
            });
        });

        // 3. Текущее сообщение пользователя
        messages.push({
            role: 'user',
            content: userMessage
        });

        return messages;
    }

    private getRecentHistory(history: ChatMessage[], maxMessages: number): ChatMessage[] {
        if (history.length <= 1) return [];
        
        // Берем последние N сообщений (но не включаем текущее)
        const startIndex = Math.max(0, history.length - 1 - maxMessages);
        return history.slice(startIndex, -1);
    }

    private buildSystemPrompt(): string {
        // Только системный промпт и контекст курса, без истории диалога
        return this.systemPrompt + "\n\n" + 
               "КОНТЕКСТ КУРСА:\n" + this.aiContext;
    }
}
