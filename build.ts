import { cp, rm, mkdir } from 'node:fs/promises'; // Added mkdir
import { join } from 'node:path';

// --- Конфигурация сборки ---
const SRC_UI_DIR = 'src/ui';
const ENTRY_POINTS = [
  join(SRC_UI_DIR, 'user-id-manager.ts'), // ДОБАВИТЬ ПЕРВЫМ!
  join(SRC_UI_DIR, 'main-of-details.ts'),
  join(SRC_UI_DIR, 'tracker.ts'),
  join(SRC_UI_DIR, 'form-logic.ts'),
  join(SRC_UI_DIR, 'chat-logic.ts'),
];
const HTML_FILES = [
  join(SRC_UI_DIR, 'index.html'),
  join(SRC_UI_DIR, 'form.html'),
  join(SRC_UI_DIR, 'details.html'),
];

// --- Получение аргументов командной строки ---
const args = process.argv.slice(2);
const isProd = args.includes('--prod');
const isDev = args.includes('--dev');

if (!isProd && !isDev) {
  console.error('Ошибка: Укажите режим сборки (--dev или --prod).');
  process.exit(1);
}

const OUT_DIR = isProd ? 'dist/prod' : 'dist/dev';
const API_BASE_URL = isProd ? process.env.API_BASE_URL || 'https://course.dedok.life' : 'http://localhost:3000';

console.log(`Начинается сборка в режиме: ${isProd ? 'Production' : 'Development'}`);
console.log(`Выходная директория: ${OUT_DIR}`);
console.log(`API_BASE_URL: ${API_BASE_URL}`);

// --- Очистка и создание директории ---
async function cleanAndCreateDir() {
  console.log(`Очистка директории: ${OUT_DIR}`);
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true }); // Changed to mkdir
  console.log('Директория готова.');
}

// --- Копирование HTML файлов ---
async function copyHtmlFiles() {
  console.log('Копирование HTML файлов...');
  for (const file of HTML_FILES) {
    const dest = join(OUT_DIR, file.split('/').pop()!);
    await cp(file, dest);
  }
  console.log('HTML файлы скопированы.');
}

// --- Сборка JavaScript/TypeScript ---
async function buildJsTs() {
  console.log('Сборка JavaScript/TypeScript...');
  const result = await Bun.build({
    entrypoints: ENTRY_POINTS,
    outdir: OUT_DIR,
    minify: isProd,
    sourcemap: isDev ? 'inline' : 'none',
    env: 'inline',
    target: 'browser',
    define: {
      __API_BASE_URL__: JSON.stringify(API_BASE_URL),
    },
    format: 'esm', // Используем ES модули
    splitting: true, // Включаем разделение кода
    external: [], // Указываем внешние зависимости если есть
  });

  if (result.success) {
    console.log('JavaScript/TypeScript успешно собраны.');
  } else {
    console.error('Ошибка сборки JavaScript/TypeScript:', result);
    process.exit(1);
  }
}

// --- Запуск процесса сборки ---
async function runBuild() {
  try {
    await cleanAndCreateDir();
    await copyHtmlFiles();
    await buildJsTs();
    console.log('Сборка завершена успешно!');
  } catch (error: any) {
    console.error('Ошибка в процессе сборки:', error.message);
    process.exit(1);
  }
}

runBuild();
