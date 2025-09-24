import { describe, it, expect } from 'bun:test';
import { TEST_BASE_URL, testDb } from './setup';

describe.skip('E2E: Аналитика', () => {
  it('должен сохранять события аналитики', async () => {
    const response = await fetch(`${TEST_BASE_URL}/`, {
      method: 'GET',
    });

    expect(response.status).toBe(200);
  });
});