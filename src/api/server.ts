import { Db } from './db'; // Use the Db class directly
import { saveAnalyticsData } from './services/analytics';
import { saveFormData } from './services/formSubmission';
import { join } from 'path';

try {
  // --- Конфигурация ---
  const PORT = process.env.PORT || 3000;
  const DB_PATH = process.env.DB_PATH || './course.sqlite'; // Путь к вашей БД

  // --- CORS Headers ---
  const allowedOrigin = process.env.NODE_ENV === 'production' 
    ? process.env.API_BASE_URL // For production, use the domain from .env.production
    : 'http://localhost:3000'; // For development

  const CORS_HEADERS = {
    'Access-Control-Allow-Origin': process.env.NODE_ENV === 'test' ? '*' : allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  // --- Инициализация БД ---
  const appDb = new Db(DB_PATH); // Use the new Db class
  try {
    appDb.connect(); // Connect using the Db class
  await appDb.runMigrations('./migrations'); // Запуск миграций
  } catch (error: any) {
    console.error(`Ошибка подключения к базе данных: ${error.message}`);
    process.exit(1); // Выходим, если не удалось подключиться к БД
  }

  // --- Rate Limiting (Простое ограничение по IP в памяти) ---
  const rateLimitStore = new Map<string, { count: number; startTime: number }>();
  const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 минута
  const MAX_REQUESTS_PER_WINDOW = 10; // 10 запросов в минуту с одного IP

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
        return new Response(null, {
          status: 204, // No Content
          headers: CORS_HEADERS,
        });
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
      } else { 
        // --- Раздача статических файлов ---
        const isProd = process.env.NODE_ENV === 'production';
        const staticDir = isProd ? 'dist/prod' : 'dist/dev';
        let filePath;

        // Если путь - корень, отдаем index.html
        if (url.pathname === '/') {
          filePath = join(process.cwd(), staticDir, 'index.html');
        } else {
          // Для всех остальных запросов пытаемся отдать файл по запрошенному пути
          filePath = join(process.cwd(), staticDir, url.pathname);
        }

        const file = Bun.file(filePath);
        if (await file.exists()) {
          return new Response(file);
        }

        return new Response('Не найдено', { status: 404 });
      }
    },
  });

  console.log(`Bun.serve сервер слушает на порту ${server.port}`);

  // Обработка завершения процесса для закрытия БД
  process.on('beforeExit', () => {
    // appDb.close(); // Close using the Db class - Временно закомментировано для отладки
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('SERVER: Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1); // Завершаем процесс с ошибкой
  });
} catch (globalError: any) {
  console.error('SERVER: Uncaught global error:', globalError);
  process.exit(1);
}
