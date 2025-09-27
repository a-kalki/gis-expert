import { Db } from './db'; // Use the Db class directly
import { saveAnalyticsData } from './services/analytics';
import { saveFormData } from './services/formSubmission';
import { join } from 'path';
import { OpenAIService } from './ai/openai-service';

try {
  // --- Конфигурация ---
  const PORT = process.env.PORT || 3000;
  const DB_PATH = process.env.DB_PATH || './course.sqlite';
  const AI_API_KEY = process.env.AI_CHAT_OPENAI_API_KEY as string;

  if (!AI_API_KEY) {
    throw new Error('AI_API_KEY не установлена');
  }

  // Инициализация сервисов
  const aiService = new OpenAIService(AI_API_KEY, 'gpt-4o');

  // CORS Headers
  const allowedOrigin = process.env.NODE_ENV === 'production'
    ? process.env.API_BASE_URL
    : 'http://localhost:3000';

  const CORS_HEADERS = {
    'Access-Control-Allow-Origin': process.env.NODE_ENV === 'test' ? '*' : allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Инициализация БД
  const appDb = new Db(DB_PATH);
  try {
    appDb.connect();
    await appDb.runMigrations('./migrations');
  } catch (error: any) {
    console.error(`Ошибка БД: ${error.message}`);
    process.exit(1);
  }

  // Rate Limiting (оставляем как было)
  const rateLimitStore = new Map<string, { count: number; startTime: number }>();
  const RATE_LIMIT_WINDOW_MS = 60 * 1000;
  const MAX_REQUESTS_PER_WINDOW = 10;

  function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const record = rateLimitStore.get(ip);

    if (!record || now - record.startTime > RATE_LIMIT_WINDOW_MS) {
      // Если записи нет или окно истекло, создаем новую
      rateLimitStore.set(ip, { count: 1, startTime: now });
      return false;
    }

    record.count++;
    if (record.count > MAX_REQUESTS_PER_WINDOW) {
      // Превышен лимит
      return true;
    }

    return false;
  }

  // --- Запуск сервера ---
  console.log('SERVER: Starting Bun.serve...');
  const server = Bun.serve({
    port: PORT,
    async fetch(request: Request): Promise<Response> {
      const url = new URL(request.url);
      console.log(`Получен запрос: ${request.method} ${url.pathname}`);

      // Применяем ограничение к POST запросам
      if (request.method === 'POST') {
        const ip = server.requestIP(request)?.address || 'unknown';
        if (isRateLimited(ip)) {
          console.warn(`RATE LIMIT: IP ${ip} заблокирован.`);
          return new Response('Слишком много запросов, попробуйте позже.', { status: 429 });
        }
      }

      if (request.method === 'OPTIONS') {
        // Обработка CORS preflight запросов
        return new Response(null, { status: 204, headers: CORS_HEADERS });
      }

      if (request.method === 'POST' && url.pathname === '/api/track') {
        try {
          const data = await request.json();
          await saveAnalyticsData(appDb.connect(), data); // Pass the Database instance from appDb

          return new Response('Данные аналитики получены и сохранены', { status: 200, headers: CORS_HEADERS });
        } catch (error: any) {
          console.error('SERVER: Error processing analytics data:', error);
          const isProd = process.env.NODE_ENV === 'production';
          const errorMessage = isProd ? 'Внутренняя ошибка сервера.' : `Ошибка: ${error.message}`;
          const status = isProd ? 500 : 400;
          return new Response(errorMessage, { status, headers: CORS_HEADERS });
        }
      } else if (request.method === 'POST' && url.pathname === '/api/submit-form') {
        try {
          const formData = await request.json();
          await saveFormData(appDb.connect(), formData); // Pass the Database instance from appDb

          return new Response('Данные формы получены и сохранены', { status: 200, headers: CORS_HEADERS });
        } catch (error: any) {
          console.error('Ошибка при обработке данных формы:', error);
          const isProd = process.env.NODE_ENV === 'production';
          const errorMessage = isProd ? 'Внутренняя ошибка сервера.' : `Ошибка: ${error.message}`;
          const status = isProd ? 500 : 400;
          return new Response(errorMessage, { status, headers: CORS_HEADERS });
        }
      } else if (request.method === 'POST' && url.pathname === '/api/chat') {
        try {
            const { question, userId } = await request.json();
            
            if (!question || typeof question !== 'string') {
                return new Response('"question" обязательно', { status: 400, headers: CORS_HEADERS });
            }
            
            if (!userId || typeof userId !== 'string') {
                return new Response('"userId" обязательно', { status: 400, headers: CORS_HEADERS });
            }

            console.log(`Chat request from user: ${userId.substring(0, 8)}...`);

            // Остальной код без изменений
            const stream = new ReadableStream({
                async start(controller) {
                    try {
                        for await (const chunk of aiService.processMessage(userId, question)) {
                            controller.enqueue(new TextEncoder().encode(chunk));
                        }
                    } catch (error) {
                        console.error('Stream error:', error);
                        controller.enqueue(new TextEncoder().encode('Ошибка потока'));
                    } finally {
                        controller.close();
                    }
                }
            });

            return new Response(stream, {
                headers: {
                    ...CORS_HEADERS,
                    'Content-Type': 'text/plain; charset=utf-8',
                }
            });

        } catch (error: any) {
            console.error('CHAT API ERROR:', error);
            return new Response('Внутренняя ошибка', { status: 500, headers: CORS_HEADERS });
        }
      } else {
        // --- Раздача статических файлов ---
        const isProd = process.env.NODE_ENV === 'production';
        const staticDir = isProd ? 'dist/prod' : 'dist/dev';
        let filePath = url.pathname === '/'
          ? join(process.cwd(), staticDir, 'index.html')
          : join(process.cwd(), staticDir, url.pathname);

        let file = Bun.file(filePath);
        // Если файл не найден, пробуем добавить .html
        if (!(await file.exists())) {
          filePath = `${filePath}.html`;
          file = Bun.file(filePath);
        }

        if (await file.exists()) {
          return new Response(file);
        }

        return new Response('Не найдено', { status: 404 });
      }
    },
  });
} catch (error: any) {
  console.error('SERVER: Критическая ошибка при запуске сервера:', error);
  process.exit(1);
}
