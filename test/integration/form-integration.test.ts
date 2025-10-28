import { describe, test, expect, beforeEach } from 'bun:test';
import { createTestWindow } from '../setup';
import { FormFactory } from '../utils/form-factory';

describe('Интеграционные тесты формы', () => {
  let window: any;
  let document: Document;

  test('должна загружать реальный HTML формы', () => {
    const { html, form } = FormFactory.createEmptyForm();
    window = createTestWindow(html);
    document = window.document;
    
    expect(document.getElementById('courseApplicationForm')).toBeTruthy();
    expect(document.getElementById('name')).toBeTruthy();
    expect(document.getElementById('phone')).toBeTruthy();
  });

  test('должна корректно заполнять форму данными', () => {
    const { form } = FormFactory.createValidForm();
    
    const nameInput = form.querySelector('#name') as HTMLInputElement;
    const phoneInput = form.querySelector('#phone') as HTMLInputElement;
    
    expect(nameInput.value).toBe('Тестовый Пользователь');
    expect(phoneInput.value).toBe('+77001234567');
  });
});
