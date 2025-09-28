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
                hasHistory: history.length > 1
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

            // Стриминг
            const reader = response.body?.getReader();
            if (!reader) throw new Error('No reader');

            const decoder = new TextDecoder();
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ') && !line.includes('[DONE]')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            const content = data.choices[0]?.delta?.content;
                            if (content) {
                                yield content;
                            }
                        } catch (e) {
                            // Игнорируем ошибки парсинга
                        }
                    }
                }
            }

        } catch (error: any) {
            console.error("DEEPSEEK ERROR:", error);
            yield "Извините, сервис временно недоступен. Попробуйте позже.";
        }
    }

    private prepareMessages(userMessage: string, history: ChatMessage[]) {
        const messages = [];
        
        // 1. Сначала системный промпт
        messages.push({
            role: 'system',
            content: this.buildPromptWithHistory(userMessage, history)
        });

        // 2. Затем вся история диалога как user/assistant сообщения
        // Берем всю историю кроме последнего сообщения (оно будет добавлено отдельно)
        const conversationHistory = history.slice(0, -1);
        
        conversationHistory.forEach(msg => {
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

    private buildPromptWithHistory(userMessage: string, history: ChatMessage[]): string {
        // Используем готовый системный промпт
        let prompt = this.systemPrompt + "\n\n";
        
        // Добавляем контекст курса
        prompt += "КОНТЕКСТ КУРСА:\n" + this.aiContext + "\n\n";

        // Добавляем информацию о текущем диалоге
        if (history.length > 1) {
            prompt += "ТЕКУЩИЙ ДИАЛОГ:\n";
            const relevantHistory = history.slice(0, -1); // Все кроме текущего сообщения
            
            relevantHistory.forEach((msg, index) => {
                const isLast = index === relevantHistory.length - 1;
                const role = msg.role === 'user' ? 'СТУДЕНТ' : 'НАСТАВНИК';
                const prefix = isLast ? 'ПОСЛЕДНИЙ ОБМЕН: ' : '';
                prompt += `${prefix}${role}: ${msg.content}\n`;
            });
            prompt += "\n";
        }

        prompt += `ТЕКУЩИЙ ВОПРОС СТУДЕНТА: ${userMessage}`;
        
        return prompt;
    }
}
