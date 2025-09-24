import { cwd } from 'process';
import { join } from 'path';
import { Db } from '../src/api/db';

const projectDir = cwd();
const dbPath = join(projectDir, 'course.sqlite');

const args = process.argv.slice(2);
const forceRun = args.includes('--force');

if (process.env.NODE_ENV === 'production' && !forceRun) {
  console.error('ОШИБКА: Попытка запустить миграции в production без флага --force.');
  console.error('Это может привести к потере данных. Используйте `bun run db-utils/run-migrations.ts --force` для принудительного запуска.');
  process.exit(1);
}

console.log(`Запуск миграций для базы данных: ${dbPath}`);
const db = new Db(dbPath);
db.runMigrations('migrations');
console.log('Миграции успешно применены.');
