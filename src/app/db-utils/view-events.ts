import { Database } from 'bun:sqlite';
import { UserEventsRepository } from '@course/api/repositories/userEventsRepository';

function showHelp() {
  console.log(`
Использование: bun run db-utils/view-events.ts [опции]

Опции:
  --limit <число>    Количество последних событий для показа (по умолчанию: 10)
  --user <userId>    Фильтровать события по ID пользователя
  --page <pageName>  Фильтровать события по названию страницы
  --format <формат>  Формат вывода: json, table, csv (по умолчанию: table)
  --json             Короткий алиас для --format=json
  --help             Показать эту справку

Примеры:
  bun run db-utils/view-events.ts
  bun run db-utils/view-events.ts --limit 20
  bun run db-utils/view-events.ts --user "user123" --json
  bun run db-utils/view-events.ts --page "index" --limit 5 --format csv
  `);
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    showHelp();
    return;
  }

  const limit = parseInt(args.find(arg => arg.startsWith('--limit='))?.split('=')[1] || '10');
  const userId = args.find(arg => arg.startsWith('--user='))?.split('=')[1];
  const pageName = args.find(arg => arg.startsWith('--page='))?.split('=')[1];
  const format = args.includes('--json') ? 'json' : 
                 args.find(arg => arg.startsWith('--format='))?.split('=')[1] || 'table';

  // Остальной код без изменений...
  const db = new Database('course.sqlite');
  const repo = new UserEventsRepository(db);

  try {
    let events;
    
    if (userId || pageName) {
      events = repo.getFilteredEvents({ userId, pageName, limit });
    } else {
      events = repo.getLatest(limit);
    }

    console.log(`📊 Найдено ${events.length} событий`);
    formatEvents(events, format);
    
  } catch (error) {
    console.error('❌ Ошибка при получении событий:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

function truncateLongValues(obj: any, maxLength: number = 50): any {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  const truncated = { ...obj };
  for (const key in truncated) {
    if (typeof truncated[key] === 'string' && truncated[key].length > maxLength) {
      truncated[key] = truncated[key].substring(0, maxLength) + '...';
    }
  }
  return truncated;
}

function formatEvents(events: any[], format: string) {
  switch (format) {
    case 'json':
      console.log(JSON.stringify(events, null, 2));
      break;
    
    case 'csv':
      if (events.length === 0) return;
      // Убираем ненужные поля для CSV
      const filteredEvents = events.map(({ created_at, updated_at, ...rest }) => rest);
      const headers = Object.keys(filteredEvents[0]).join(',');
      console.log(headers);
      filteredEvents.forEach(event => {
        const values = Object.values(event).map(value => 
          typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
        ).join(',');
        console.log(values);
      });
      break;
    
    case 'table':
    default:
      // Убираем created_at, updated_at и укорачиваем длинные строки
      const truncatedEvents = events.map(event => {
        const { created_at, updated_at, ...rest } = event;
        return truncateLongValues(rest, 30);
      });
      console.table(truncatedEvents);
      break;
  }
}

main();
