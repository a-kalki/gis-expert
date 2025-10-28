import { rm, mkdir, readdir, cp, stat } from 'node:fs/promises';
import { join, dirname, basename, relative } from 'node:path';

// --- Конфигурация ---
const SRC_DIR = 'src';
const OUT_DIR = process.env.NODE_ENV === 'production' ? 'dist/prod' : 'dist/dev';

// --- Модули с явной конфигурацией ---
const MODULES = {
  community: {
    entry: 'src/community/ui/community.html',
    assets: ['src/community/ui/**/*.{css,ts,js}'],
    dependencies: [] // Теперь зависимости на уровне корня
  },
  course: {
    entry: 'src/course/ui/course-landing.html',
    assets: [
      'src/course/ui/**/*.{css,ts,js,html}',
    ],
    dependencies: [] // Теперь зависимости на уровне корня
  }
};

// Общие зависимости (будут в корне dist)
const SHARED_DEPENDENCIES = [
  'src/app/ui/common.css',
  'src/app/ui/tracker.ts',
  'src/app/ui/user-session-manager.ts',
  'src/app/ui/tab-manager.ts'
];

// --- Получение аргументов командной строки ---
const args = process.argv.slice(2);
const isProd = args.includes('--prod');
const isDev = args.includes('--dev');

if (!isProd && !isDev) {
  console.error('Ошибка: Укажите режим сборки (--dev или --prod).');
  process.exit(1);
}

console.log(`Начинается сборка в режиме: ${isProd ? 'Production' : 'Development'}`);
console.log(`Выходная директория: ${OUT_DIR}`);

// --- Функции сборки ---

async function cleanAndCreateDir() {
  console.log(`Очистка директории: ${OUT_DIR}`);
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });
  console.log('Директория готова.');
}

async function copyFile(source: string, destination: string) {
  await mkdir(dirname(destination), { recursive: true });
  await cp(source, destination);
  console.log(`📁 Скопирован: ${source} → ${destination}`);
}

async function findFiles(pattern: string): Promise<string[]> {
  const glob = new Bun.Glob(pattern);
  const files = [];
  for await (const file of glob.scan(".")) {
    // Пропускаем тестовые файлы
    if (!file.endsWith('.test.ts') && !file.includes('.test.')) {
      files.push(file);
    }
  }
  return files;
}

async function buildSharedDependencies() {
  console.log('\n--- Сборка общих зависимостей ---');
  const copiedFiles: string[] = [];

  // Собираем TypeScript общие зависимости
  const notTsDeps = SHARED_DEPENDENCIES.filter(dep => !dep.endsWith('.ts'));
  for (const fileName of notTsDeps) {
    const name = basename(fileName);
    await copyFile(fileName, join(OUT_DIR, name));
  }

  // Собираем TypeScript общие зависимости
  const tsDeps = SHARED_DEPENDENCIES.filter(dep => dep.endsWith('.ts'));
  if (tsDeps.length > 0) {
    console.log('Сборка общих TypeScript файлов...');
    
    // Компилируем TS в JS
    const result = await Bun.build({
      entrypoints: tsDeps,
      outdir: OUT_DIR,
      minify: isProd,
      sourcemap: isDev ? 'inline' : 'none',
      target: 'browser',
      format: 'esm',
      splitting: false,
    });

    if (result.success) {
      console.log('✅ Общие зависимости успешно собраны');
      // Добавляем скомпилированные JS файлы в список
      for (const tsDep of tsDeps) {
        const baseName = basename(tsDep, '.ts');
        copiedFiles.push(`${baseName}.js`);
      }
      
      // УДАЛЯЕМ исходные .ts файлы из выходной директории
      for (const tsDep of tsDeps) {
        const name = basename(tsDep);
        const tsPath = join(OUT_DIR, name);
        try {
          await rm(tsPath);
          console.log(`🗑️  Удален исходный TS файл: ${name}`);
        } catch (error) {
          // Игнорируем ошибки удаления
        }
      }
    } else {
      console.error('❌ Ошибка сборки общих зависимостей:');
      for (const message of result.logs) {
        console.error(message);
      }
      throw new Error('Сборка общих зависимостей завершилась с ошибками');
    }
  }

  return copiedFiles;
}

async function buildModule(moduleName: string, config: typeof MODULES[keyof typeof MODULES]) {
  console.log(`\n--- Сборка модуля: ${moduleName} ---`);
  const moduleOutDir = join(OUT_DIR, moduleName);
  await mkdir(moduleOutDir, { recursive: true });

  const copiedFiles: string[] = [];

  // 1. Копируем основные HTML файлы
  if (config.entry) {
    const htmlName = basename(config.entry);
    await copyFile(config.entry, join(moduleOutDir, htmlName));
    copiedFiles.push(htmlName);
    
    // Для курсов копируем дополнительные HTML файлы
    if (moduleName === 'course') {
      const additionalHtml = await findFiles('src/course/ui/*.html');
      for (const htmlFile of additionalHtml) {
        if (htmlFile !== config.entry) {
          const name = basename(htmlFile);
          await copyFile(htmlFile, join(moduleOutDir, name));
          copiedFiles.push(name);
        }
      }
    }
  }

  // 2. Копируем ассеты модуля
  for (const assetPattern of config.assets) {
    const assetFiles = await findFiles(assetPattern);
    for (const assetFile of assetFiles) {
      // Пропускаем HTML файлы
      if (assetFile.endsWith('.html')) continue;
      
      const relativePath = assetFile.replace(`src/${moduleName}/ui/`, '');
      const destPath = join(moduleOutDir, relativePath);
      await copyFile(assetFile, destPath);
      copiedFiles.push(relativePath);
    }
  }

  // 3. Собираем TypeScript/JavaScript файлы (только специфичные для модуля)
  const tsFiles = (await findFiles(`src/${moduleName}/ui/**/*.{ts,js}`))
    .filter(file => !file.endsWith('.test.ts') && !file.endsWith('.test.js'));

  const allEntryPoints = [...tsFiles];

  if (allEntryPoints.length > 0) {
    console.log(`[${moduleName}] Сборка TypeScript/JavaScript...`);
    
    try {
      const result = await Bun.build({
        entrypoints: allEntryPoints,
        outdir: moduleOutDir,
        minify: isProd,
        sourcemap: isDev ? 'inline' : 'none',
        target: 'browser',
        format: 'esm',
        splitting: false,
      });

      if (result.success) {
        console.log(`✅ [${moduleName}] JavaScript/TypeScript успешно собраны.`);
        
        // Добавляем скомпилированные JS файлы в список
        for (const entry of allEntryPoints) {
          const baseName = basename(entry, '.ts');
          copiedFiles.push(`${baseName}.js`);
        }
      } else {
        console.error(`❌ [${moduleName}] Ошибка сборки JavaScript/TypeScript:`);
        for (const [index, message] of result.logs.entries()) {
          console.error(`\n--- Ошибка ${index + 1} ---`);
          console.error(`Сообщение: ${message.message}`);
          if (message.position) {
            console.error(`Файл: ${message.position?.file}`);
          }
        }
        throw new Error(`Сборка TypeScript для модуля ${moduleName} завершилась с ошибками`);
      }
    } catch (error: any) {
      console.error(`💥 [${moduleName}] Критическая ошибка при сборке TypeScript:`);
      console.error(error.message);
      throw error;
    }
  } else {
    console.log(`[${moduleName}] TypeScript/JavaScript файлы не найдены.`);
  }

  return {
    moduleName,
    outDir: moduleOutDir,
    files: copiedFiles
  };
}

// --- Функция для отображения структуры директории ---
async function printDirectoryStructure(dir: string, prefix = ''): Promise<string[]> {
  try {
    const items = await readdir(dir);
    const lines: string[] = [];
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemPath = join(dir, item);
      const stats = await stat(itemPath);
      const isLast = i === items.length - 1;
      
      const currentPrefix = prefix + (isLast ? '└── ' : '├── ');
      lines.push(currentPrefix + item);
      
      if (stats.isDirectory()) {
        const newPrefix = prefix + (isLast ? '    ' : '│   ');
        const subLines = await printDirectoryStructure(itemPath, newPrefix);
        lines.push(...subLines);
      }
    }
    
    return lines;
  } catch (error) {
    return [`${prefix}❌ Ошибка чтения директории: ${error}`];
  }
}

// --- Запуск процесса сборки ---
async function runBuild() {
  try {
    await cleanAndCreateDir();

    const buildResults = [];

    // 1. Сначала собираем общие зависимости
    const sharedFiles = await buildSharedDependencies();

    // 2. Затем собираем каждый модуль
    for (const [moduleName, config] of Object.entries(MODULES)) {
      try {
        const result = await buildModule(moduleName, config);
        buildResults.push(result);
      } catch (error) {
        console.error(`\n💥 Сборка модуля ${moduleName} завершилась с ошибкой`);
        throw error;
      }
    }

    console.log('\n✅ Сборка завершена успешно!');
    
    // Выводим динамическую структуру
    console.log('\n📁 Структура выходной директории:');
    try {
      const structureLines = await printDirectoryStructure(OUT_DIR);
      structureLines.forEach(line => console.log(line));
    } catch (error) {
      console.log('❌ Не удалось отобразить структуру директории:', error);
    }

    // Выводим краткую статистику
    console.log('\n📊 Статистика сборки:');
    console.log(`   Общие файлы: ${sharedFiles.length} файлов`);
    for (const result of buildResults) {
      console.log(`   ${result.moduleName}: ${result.files.length} файлов`);
    }

  } catch (error: any) {
    console.error('\n❌ Критическая ошибка в процессе сборки:');
    console.error('Сообщение:', error.message);
    process.exit(1);
  }
}

runBuild();
