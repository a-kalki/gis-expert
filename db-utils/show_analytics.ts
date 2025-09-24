
import { Database } from 'bun:sqlite';
import { UserEventsRepository } from '../src/api/repositories/userEventsRepository';

const db = new Database('course.sqlite');
const repo = new UserEventsRepository(db);

const events = repo.getLatest(10);

console.log(JSON.stringify(events, null, 2));
