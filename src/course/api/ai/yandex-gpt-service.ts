import { AIService, ChatMessage } from './ai-service';

export class YandexGPTService extends AIService {
    private folderId: string;
    private apiKey: string;
    private apiUrl: string = 'https://llm.api.cloud.yandex.net/foundationModels/v1/completion';

    constructor(folderId: string, apiKey: string) {
        super();
        this.folderId = folderId;
        this.apiKey = apiKey;
    }

    protected async *generateResponse(userMessage: string, history: ChatMessage[]): AsyncGenerator<string> {
        try {
            const messages = this.prepareMessages(userMessage, history);
            
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Api-Key ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'x-folder-id': this.folderId,
                },
                body: JSON.stringify({
                    modelUri: `gpt://${this.folderId}/yandexgpt/latest`,
                    completionOptions: {
                        stream: false,
                        temperature: 0.7,
                        maxTokens: 1000
                    },
                    messages: messages
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('YandexGPT API Error:', errorText);
                throw new Error(`YandexGPT error: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.result?.alternatives?.[0]?.message?.text) {
                throw new Error('Invalid response format from YandexGPT');
            }

            const responseText = data.result.alternatives[0].message.text;
            
            // Эмулируем стриминг
            yield* this.streamText(responseText);

        } catch (error: any) {
            console.error("YANDEX GPT ERROR:", error);
            yield "Извините, в данный момент сервис недоступен. Попробуйте позже или свяжитесь с Нурболатом напрямую.";
        }
    }

    private async *streamText(text: string): AsyncGenerator<string> {
        // Разбиваем текст на части для имитации стриминга
        const chunkSize = 3;
        for (let i = 0; i < text.length; i += chunkSize) {
            yield text.substring(i, i + chunkSize);
            await new Promise(resolve => setTimeout(resolve, 30));
        }
    }

    private prepareMessages(userMessage: string, history: ChatMessage[]) {
        const messages = [];
        
        // Системный промпт
        messages.push({
            role: 'system',
            text: this.buildSystemPrompt(history)
        });

        // История диалога (последние 5 пар сообщений)
        const recentHistory = history.slice(-10); // 5 пар user/assistant
        recentHistory.forEach(msg => {
            messages.push({
                role: msg.role === 'user' ? 'user' : 'assistant',
                text: msg.content
            });
        });

        // Текущее сообщение пользователя
        messages.push({
            role: 'user',
            text: userMessage
        });

        return messages;
    }

    private buildSystemPrompt(history: ChatMessage[]): string {
        let prompt = this.systemPrompt + "\n\nКОНТЕКСТ КУРСА:\n" + this.aiContext + "\n\n";

        // Добавляем анализ диалога
        const hasDetailedQuestions = this.hasDetailedQuestions(history);
        const userIsReady = this.userExpressedReadiness(history);
        
        prompt += `КОНТЕКСТ ДИАЛОГА:\n`;
        prompt += `- Пользователь задал подробные вопросы: ${hasDetailedQuestions ? 'да' : 'нет'}\n`;
        prompt += `- Пользователь готов к действию: ${userIsReady ? 'да' : 'нет'}\n\n`;

        return prompt;
    }
}
