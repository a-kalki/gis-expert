import { describe, it, expect } from 'bun:test';
import { TEST_BASE_URL } from './setup';

describe('E2E: API чата', () => {
  // Функция для чтения стрима в текст
  const streamToString = async (stream: ReadableStream<Uint8Array>): Promise<string> => {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let result = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      result += decoder.decode(value, { stream: true });
    }
    return result;
  };

  it('должен отвечать на вопрос в рамках контекста', async () => {
    const payload = {
      question: 'Сколько стоят курсы?'
    };

    const response = await fetch(`${TEST_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    expect(response.status).toBe(200);
    expect(response.body).not.toBeNull();

    if (response.body) {
      const responseText = await streamToString(response.body);
      console.log('Ответ ИИ (в контексте):', responseText);
      expect(responseText).not.toBeEmpty();
      // Проверяем, что в ответе есть упоминание валюты, так как вопрос о цене
      expect(responseText).toInclude('тенге');
    }
  }, 20000); // Увеличиваем таймаут до 20 секунд для LLM

  it('должен корректно обрабатывать вопрос вне контекста', async () => {
    const payload = {
      question: 'Какая столица Франции?'
    };

    const response = await fetch(`${TEST_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    expect(response.status).toBe(200);
    expect(response.body).not.toBeNull();

    if (response.body) {
      const responseText = await streamToString(response.body);
      console.log('Ответ ИИ (вне контекста):', responseText);
      expect(responseText).not.toBeEmpty();
      // Проверяем, что ИИ отвечает в соответствии с системным промптом,
      // т.е. говорит, что не может ответить или ссылается на контекст.
      // Выбираем несколько возможных вариантов ответа.
      const possibleDenials = [
        'не могу ответить',
        'не знаю',
        'в предоставленном контексте',
        'информации о курсе',
        'моя задача — отвечать на вопросы'
      ];
      const receivedDenial = possibleDenials.some(denial => responseText.toLowerCase().includes(denial));
      expect(receivedDenial).toBe(true);
    }
  }, 20000); // Увеличиваем таймаут
});
