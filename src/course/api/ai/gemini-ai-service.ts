import { AIService, ChatMessage } from './ai-service';

export class GoogleAIService extends AIService {
    private apiKey: string;
    private modelName: string;
    private apiUrl: string;

    constructor(apiKey: string, modelName: string = 'gemini-2.5-flash') {
        super();
        this.apiKey = apiKey;
        this.modelName = modelName;
        this.apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent`;
    }

    protected async *generateResponse(userMessage: string, history: ChatMessage[]): AsyncGenerator<string> {
        try {
            const prompt = this.buildPrompt(userMessage, history);
            
            console.log('Sending request to Google AI with model:', this.modelName);
            
            const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: prompt
                                }
                            ]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 1000,
                        topP: 0.8,
                        topK: 40
                    },
                    safetySettings: [
                        {
                            category: "HARM_CATEGORY_HARASSMENT",
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        },
                        {
                            category: "HARM_CATEGORY_HATE_SPEECH", 
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        }
                    ]
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Google AI API Error:', {
                    status: response.status,
                    model: this.modelName,
                    error: errorText
                });
                
                if (response.status === 404) {
                    // Попробуем другую модель
                    yield* this.fallbackModel(userMessage, history);
                    return;
                } else if (response.status === 429) {
                    yield "Слишком много запросов. Попробуйте через минуту.";
                } else {
                    yield "Временные проблемы с сервисом. Попробуйте позже.";
                }
                return;
            }

            const data = await response.json();
            
            if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
                console.error('Invalid response format:', data);
                throw new Error('Invalid response format from Google AI');
            }

            const responseText = data.candidates[0].content.parts[0].text;
            
            // Эмулируем стриминг
            yield* this.streamText(responseText);

        } catch (error: any) {
            console.error("GOOGLE AI ERROR:", error);
            yield "Извините, произошла ошибка соединения. Попробуйте позже.";
        }
    }

    private async *fallbackModel(userMessage: string, history: ChatMessage[]): AsyncGenerator<string> {
        console.log('Trying fallback model: gemini-1.5-flash-001');
        
        // Пробуем конкретную версию модели
        const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-001:generateContent?key=${this.apiKey}`;
        
        try {
            const prompt = this.buildPrompt(userMessage, history);
            
            const response = await fetch(fallbackUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: prompt
                                }
                            ]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 1000,
                    }
                }),
            });

            if (response.ok) {
                const data = await response.json();
                const responseText = data.candidates[0].content.parts[0].text;
                yield* this.streamText(responseText);
            } else {
                yield "Сервис временно недоступен. Пожалуйста, попробуйте позже или свяжитесь с Нурболатом напрямую.";
            }
        } catch (error) {
            yield "Ошибка сервиса. Попробуйте позже.";
        }
    }

    private async *streamText(text: string): AsyncGenerator<string> {
        // Более плавный стриминг
        const sentences = text.split(/(?<=[.!?])\s+/);
        
        for (const sentence of sentences) {
            const words = sentence.split(' ');
            for (const word of words) {
                yield word + ' ';
                await new Promise(resolve => setTimeout(resolve, 30));
            }
            yield '\n'; // Добавляем перенос после предложений
        }
    }

    protected buildPrompt(userMessage: string, history: ChatMessage[]): string {
        let prompt = "Ты — ИИ-помощник Нурболата на сайте курсов программирования.\n\n";
        prompt += "КОНТЕКСТ КУРСА:\n" + this.aiContext + "\n\n";
        prompt += "СИСТЕМНЫЕ ИНСТРУКЦИИ:\n" + this.systemPrompt + "\n\n";

        // Добавляем историю диалога
        if (history.length > 1) {
            prompt += "ИСТОРИЯ ДИАЛОГА:\n";
            const relevantHistory = history.slice(0, -1);
            relevantHistory.forEach(msg => {
                const role = msg.role === 'user' ? 'СТУДЕНТ' : 'НАСТАВНИК';
                prompt += `${role}: ${msg.content}\n`;
            });
            prompt += "\n";
        }

        prompt += `ТЕКУЩИЙ ВОПРОС СТУДЕНТА: ${userMessage}\n\n`;
        prompt += "ОТВЕТ НАСТАВНИКА:";
        
        return prompt;
    }
}
