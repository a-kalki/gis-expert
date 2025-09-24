
import { Database } from 'bun:sqlite';
import { FormSubmissionsRepository } from '../src/api/repositories/formSubmissionsRepository';

const db = new Database('course.sqlite');
const repo = new FormSubmissionsRepository(db);

const submissions = repo.getLatest(10);

console.log(JSON.stringify(submissions, null, 2));
