// src/tracker.js
// Модуль для сбора и отправки аналитики поведения пользователей

console.log("Трекер аналитики загружен.");

// Этап 2.2: Реализация уникального ID клиента
function getOrSetUserId() {
  const STORAGE_KEY = 'it-course-user-id'; // Используем префикс для уникальности ключа
  let userId = localStorage.getItem(STORAGE_KEY);

  if (!userId) {
    // Генерируем 8 байт случайных данных и преобразуем в 16-значную hex-строку
    const randomBytes = new Uint8Array(8);
    window.crypto.getRandomValues(randomBytes);
    userId = Array.from(randomBytes)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
    
    localStorage.setItem(STORAGE_KEY, userId);
    console.log("Сгенерирован новый User ID:", userId);
  } else {
    console.log("Найден существующий User ID:", userId);
  }
  return userId;
}

const analyticsState = {
  userId: null,
  pageName: null,
  pageVariant: null,
  startTime: null,
  timeSpent_sec: 0,
  scrollDepth_perc: 0,
  finalAction: 'close', // Действие по умолчанию
  navigationPath: [], // Для отслеживания вкладок на index.html
};

// Этап 2.3: Реализация сбора метрик
function startMetricsCollection() {
  console.log("Начало сбора метрик: время, скролл, клики...");

  // Запоминаем время начала сессии
  analyticsState.startTime = Date.now();

  // Обработчик скролла для определения максимальной глубины
  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight;
    const winHeight = document.documentElement.clientHeight;

    // Избегаем деления на ноль, если контент не превышает высоту окна
    if (docHeight === winHeight) {
      analyticsState.scrollDepth_perc = 100;
      return;
    }

    const scrollPercent = (scrollTop / (docHeight - winHeight)) * 100;

    analyticsState.scrollDepth_perc = Math.max(analyticsState.scrollDepth_perc || 0, scrollPercent);
  }, { passive: true }); // { passive: true } для лучшей производительности

  // Обработчик кликов по ключевым элементам (event delegation)
  document.body.addEventListener('click', (event) => {
    const targetElement = event.target.closest('[data-analytics-action]');
    
    if (targetElement) {
      const action = targetElement.getAttribute('data-analytics-action');
      analyticsState.finalAction = action;
      console.log(`Зафиксировано действие: ${action}`);
    }
  });

  // Логика, специфичная для index.html
  if (analyticsState.pageName === 'index') {
    console.log("Запущена логика отслеживания для index.html");
    
    let currentTab = 'about-of-course'; // Изначальная вкладка

    document.body.addEventListener('click', (event) => {
      const tabButton = event.target.closest('[data-tabname]');
      if (!tabButton) return;

      const toTab = tabButton.getAttribute('data-tabname');
      if (toTab === currentTab) return; // Не фиксируем клик по текущей же вкладке

      const eventData = {
        fromTab: currentTab,
        toTab: toTab,
        scroll_perc: Math.round(analyticsState.scrollDepth_perc),
        timestamp: new Date().toISOString(),
      };

      analyticsState.navigationPath.push(eventData);
      console.log('Переход по вкладке:', eventData);

      currentTab = toTab; // Обновляем текущую вкладку
    });

    // Дополнительно: фиксируем последнюю активную вкладку при закрытии страницы
    window.addEventListener('beforeunload', () => {
        analyticsState.finalAction = `close_on_tab_${currentTab}`;
    });
  }

  window.addEventListener('beforeunload', () => {
    // Рассчитываем общее время пребывания в секундах
    analyticsState.timeSpent_sec = Math.round((Date.now() - analyticsState.startTime) / 1000);
    
    // Округляем глубину скролла до целого числа
    analyticsState.scrollDepth_perc = Math.round(analyticsState.scrollDepth_perc);

    // Отправляем данные при закрытии страницы
    sendData(analyticsState);
  });
}

// Этап 2.4: Реализация отправки данных
function sendData(data) {
  const webhookUrl = 'http://localhost:5678/webhook-test/course-form';

  try {
    // fetch(webhookUrl, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify(data),
    //   keepalive: true,
    // });
    console.log("Отправка данных временно отключена. Данные для отправки:", data);
  } catch (error) {
    console.error("Ошибка при отправке данных через fetch:", error);
  }
}

// --- Инициализация трекера ---
function initTracker() {
  // Считываем мета-теги
  const pageNameTag = document.querySelector('meta[name="page-name"]');
  const pageVariantTag = document.querySelector('meta[name="page-variant"]');

  analyticsState.pageName = pageNameTag ? pageNameTag.content : 'unknown';
  analyticsState.pageVariant = pageVariantTag ? pageVariantTag.content : 'unknown';

  console.log(`Трекер запущен на странице: ${analyticsState.pageName} (вариант: ${analyticsState.pageVariant})`);

  analyticsState.userId = getOrSetUserId();
  startMetricsCollection();
}

// Запускаем трекер после загрузки страницы
window.addEventListener('load', initTracker);
