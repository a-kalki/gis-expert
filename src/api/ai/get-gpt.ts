import { OpenAIService } from './openai-service';
import { YandexGPTService } from './yandex-gpt-service';
import { GoogleAIService } from './gemini-ai-service'


export function getOpenAiService(): OpenAIService {
  const AI_API_KEY = process.env.AI_CHAT_OPENAI_API_KEY as string;

  if (!AI_API_KEY) {
    throw new Error('AI_API_KEY не установлена');
  }

  return new OpenAIService(AI_API_KEY, 'gpt-4o');

}

export function getYandexGptService(): YandexGPTService {
  const YANDEX_FOLDER_ID = process.env.YANDEX_FOLDER_ID as string;
  const YANDEX_API_KEY = process.env.YANDEX_API_KEY as string;

  if (!YANDEX_FOLDER_ID || !YANDEX_API_KEY) {
      console.error('YANDEX_FOLDER_ID and YANDEX_API_KEY must be set');
      process.exit(1);
  }

  return new YandexGPTService(YANDEX_FOLDER_ID, YANDEX_API_KEY);
}

export function getGeminiAiService(): GoogleAIService {
  const GOOGLE_AI_KEY = process.env.AI_GEMINI_API_KEY as string;

  if (!GOOGLE_AI_KEY) {
      console.error('GOOGLE_AI_KEY must be set');
      process.exit(1);
  }

  return new GoogleAIService(GOOGLE_AI_KEY);
}
