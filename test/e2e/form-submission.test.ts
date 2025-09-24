import { describe, it, expect, beforeEach, afterAll } from 'bun:test';
import { TEST_BASE_URL, testDb } from './setup';

describe('E2E: Отправка формы', () => {
  beforeEach(async () => {
    // Очищаем базу перед каждым тестом
    await testDb.connect().exec('DELETE FROM form_submissions');
    await testDb.connect().exec('DELETE FROM user_events');
  });

  it('должен корректно обрабатывать отправку формы', async () => {
    const formData = {
      name: 'Иван Тестовый',
      phone: '+77001234567',
      contactMethod: ['Телефонный звонок'],
      howFoundUs: 'Инстаграм',
      whyInterested: ['Решил попробовать из за бесплатных уроков'],
      programmingExperience: 'Я новичок, хочу начать',
      languageInterest: 'Python: потому что он универсален (ИИ, веб, аналитика, ...)',
      learningFormat: 'Онлайн: я живу в другом городе, а так бы выбрал офлайн',
      preferredDay: ['Понедельник', 'Вторник'],
      preferredTime: ['18-20 вечера'],
      userId: 'test-user-123'
    };

    // Отправляем POST запрос к API
    const response = await fetch(`${TEST_BASE_URL}/api/submit-form`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData)
    });

    expect(response.status).toBe(200);
    
    // Проверяем, что данные сохранились в БД
    const savedData = await testDb.connect()
      .prepare('SELECT * FROM form_submissions WHERE user_id = ?')
      .get('test-user-123');
    
    expect(savedData).toBeDefined();
    expect(savedData.name).toBe('Иван Тестовый');
    expect(savedData.phone).toBe('+77001234567');
  });

  it('должен валидировать обязательные поля', async () => {
    const invalidData = {
      // name и phone отсутствуют - должны быть ошибки
      contactMethod: ['Телефонный звонок'],
      howFoundUs: 'Инстаграм'
    };

    const response = await fetch(`${TEST_BASE_URL}/api/submit-form`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidData)
    });

    // Сервер должен возвращать 400 при ошибках валидации
    expect(response.status).toBe(400);
  });
});