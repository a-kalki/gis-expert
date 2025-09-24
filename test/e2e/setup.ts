import { afterAll, beforeAll } from 'bun:test';
import { Db } from '../../src/api/db';
import { mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

let testServer: any;
let testDb: Db;
let tempDbPath: string;
let tempDir: string;

// Глобальная настройка перед всеми E2E тестами
beforeAll(async () => {
  // Создаем временную директорию для БД
  tempDir = await mkdtemp(join(tmpdir(), 'e2e-db-'));
  tempDbPath = join(tempDir, 'test.sqlite');

  // Инициализируем testDb с файловым путем
  testDb = new Db(tempDbPath);
  await testDb.connect();
  await testDb.runMigrations('./migrations'); // Запуск миграций

  // Запускаем тестовый сервер на другом порту
  const { spawn } = require('child_process');
  
  testServer = spawn(process.execPath, ['run', 'src/api/server.ts'], {
    stdio: 'inherit', // Перенаправляем вывод сервера в консоль
    env: { 
      ...process.env, 
      PORT: '3001',
      DB_PATH: tempDbPath, // Передаем путь к файловой БД
      NODE_ENV: 'test'
    }
  });
  
  // Ждем пока сервер запустится
  await new Promise(resolve => setTimeout(resolve, 2000));
});

afterAll(async () => {
  if (testServer) {
    testServer.kill();
  }
  if (testDb) {
    await testDb.close();
  }
  // Удаляем временную директорию с БД
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
  }
});

export const TEST_BASE_URL = 'http://localhost:3001';
export { testDb };