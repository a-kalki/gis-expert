import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { chromium, Page } from 'playwright';
import { TEST_BASE_URL } from './setup';

describe('E2E: Браузерное тестирование формы', () => {
  let browser: any;
  let page: Page;

  beforeEach(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();
    await page.goto(`${TEST_BASE_URL}/form.html`);
  });

  afterEach(async () => {
    await browser.close();
  });

  it('должен показать ошибки валидации при отправке пустой формы', async () => {
    await page.click('button[type="submit"]');

    // Проверяем, что появились сообщения об ошибках
    const nameError = await page.textContent('.w3-card:has(input#name) .validation-error');
    expect(nameError).toContain('Пожалуйста, введите ваше имя.');

    const phoneError = await page.textContent('.w3-card:has(input#phone) .validation-error');
    expect(phoneError).toContain('Пожалуйста, введите номер телефона.');

    // Проверяем стили ошибки (на примере одного поля)
    const errorPanel = await page.waitForSelector('.w3-card:has(input#name) .validation-error');
    const errorPanelClass = await errorPanel.getAttribute('class');
    expect(errorPanelClass).toContain('w3-panel w3-pale-red');

    // Проверяем, что страница проскроллилась к первому невалидному полю (по имени)
    const firstInvalidField = await page.$('#name');
    const isScrolledToElement = await firstInvalidField?.isIntersectingViewport();
    expect(isScrolledToElement).toBe(true);
  });

  it('должен заполнять и отправлять форму через браузер', async () => {
    // Заполняем форму
    await page.fill('#name', 'Браузерный Тест');
    await page.fill('#phone', '+77009876543');
    await page.check('input[name="contactMethod"][value="Телефонный звонок"]');
    await page.check('input[name="howFoundUs"][value="Инстаграм"]');
    await page.check('input[name="whyInterested"][value="Кажется вы профессионалы"]');
    await page.check('input[name="programmingExperience"][value="Я новичок, хочу начать"]');
    await page.check('input[name="languageInterest"][value="Python: потому что он универсален (ИИ, веб, аналитика, ...)"]');
    await page.check('input[name="learningFormat"][value="Онлайн: я живу в другом городе, а так бы выбрал офлайн"]');
    await page.check('input[name="preferredDay"][value="Любой день"]');
    await page.check('input[name="preferredTime"][value="Любое время"]');

    // Перехватываем AJAX запрос
    const [response] = await Promise.all([
      page.waitForResponse(response =>
        response.url().includes('/api/submit-form') &&
        response.status() === 200
      ),
      page.click('button[type="submit"]')
    ]);

    expect(response.status()).toBe(200);

    // Проверяем UI feedback
    const successMessage = await page.evaluate(() => {
      // Здесь можно проверить появление success message
      return document.body.innerHTML.includes('успешно отправлена');
    });

    expect(successMessage).toBe(true);
  });
});