// src/ui/tracker.ts
// Модуль для сбора и отправки аналитики поведения пользователей

console.log("Трекер аналитики загружен.");

// --- Типы данных ---
interface NavigationEvent {
  fromTab: string;
  toTab: string;
  scroll_perc: number;
  timestamp: string;
  action?: string; // For 'clicked_form_link'
  fromPage?: string; // For 'clicked_form_link'
}

interface SectionViewTimes {
  [key: string]: number; // Section name to time spent in seconds
}

interface AnalyticsState {
  userId: string | null;
  pageName: string;
  pageVariant: string;
  startTime: number | null;
  timeSpent_sec: number;
  scrollDepth_perc: number;
  finalAction: string;
  navigationPath: NavigationEvent[];
  sectionViewTimes: SectionViewTimes;
}

interface TrackerData {
  userId: string | null;
  pageName: string;
  pageVariant: string;
  timeSpent_sec: number;
  scrollDepth_perc: number;
  finalAction: string;
  navigationPath: NavigationEvent[];
  sectionViewTimes: SectionViewTimes;
}

// --- Хранилище данных и состояния ---
const analyticsState: AnalyticsState = {
  userId: null,
  pageName: 'unknown',
  pageVariant: 'unknown',
  startTime: null,
  timeSpent_sec: 0,
  scrollDepth_perc: 0,
  finalAction: 'close',
  navigationPath: [],
  sectionViewTimes: {},
};

// Вспомогательные переменные для замера времени на секциях
const sectionEntryTimes: Map<string, number> = new Map(); // Хранит время входа секции в видимую зону

// --- Основные функции трекера ---

/**
 * Получает или генерирует уникальный ID пользователя из localStorage.
 */
function getOrSetUserId(): string {
  const STORAGE_KEY: string = 'it-course-user-id';
  let userId: string | null = localStorage.getItem(STORAGE_KEY);

  if (!userId) {
    const randomBytes: Uint8Array = new Uint8Array(8);
    window.crypto.getRandomValues(randomBytes);
    userId = Array.from(randomBytes)
      .map((byte: number) => byte.toString(16).padStart(2, '0'))
      .join('');
    localStorage.setItem(STORAGE_KEY, userId);
    console.log("Сгенерирован новый User ID:", userId);
  } else {
    console.log("Найден существующий User ID:", userId);
  }
  return userId;
}

/**
 * Инициализирует IntersectionObserver для отслеживания времени просмотра секций.
 */
function initSectionViewTimeObserver(): void {
  console.log("Инициализация отслеживания времени на секциях.");

  const sections: NodeListOf<Element> = document.querySelectorAll('[data-track-view-time]');
  if (sections.length === 0) return;

  const observer: IntersectionObserver = new IntersectionObserver((entries: IntersectionObserverEntry[]) => {
    const now: number = Date.now();
    entries.forEach((entry: IntersectionObserverEntry) => {
      const sectionName: string | undefined = (entry.target as HTMLElement).dataset.trackViewTime;
      if (sectionName) { // Ensure sectionName is not undefined
        if (entry.isIntersecting) {
          sectionEntryTimes.set(sectionName, now);
        } else {
          if (sectionEntryTimes.has(sectionName)) {
            const entryTime: number = sectionEntryTimes.get(sectionName)!; // ! asserts non-null
            const duration: number = now - entryTime;

            const currentTotal: number = analyticsState.sectionViewTimes[sectionName] || 0;
            analyticsState.sectionViewTimes[sectionName] = currentTotal + duration;

            sectionEntryTimes.delete(sectionName);
          }
        }
      }
    });
  }, {
    root: null,
    threshold: 0.5,
  });

  sections.forEach((section: Element) => observer.observe(section));
}

/**
 * Запускает сбор всех основных метрик: время сессии, скролл, клики и т.д.
 */
function startMetricsCollection(): void {
  console.log("Начало сбора метрик: время, скролл, клики...");

  analyticsState.startTime = Date.now();

  window.addEventListener('scroll', () => {
    const scrollTop: number = window.scrollY;
    const docHeight: number = document.documentElement.scrollHeight;
    const winHeight: number = document.documentElement.clientHeight;

    if (docHeight === winHeight) {
      analyticsState.scrollDepth_perc = 100;
      return;
    }

    const scrollPercent: number = (scrollTop / (docHeight - winHeight)) * 100;
    analyticsState.scrollDepth_perc = Math.max(analyticsState.scrollDepth_perc || 0, scrollPercent);
  }, { passive: true });

  document.body.addEventListener('click', (event: MouseEvent) => {
    const targetElement: HTMLElement | null = (event.target as HTMLElement).closest('[data-analytics-action]');
    if (targetElement) {
      analyticsState.finalAction = targetElement.getAttribute('data-analytics-action') || 'unknown_action';
      console.log(`Зафиксировано действие: ${analyticsState.finalAction}`);
    }
  });

  // Логика отслеживания переходов по вкладкам (только для course-details.html)
  if (analyticsState.pageName === 'details') {
    console.log("Запущена логика отслеживания вкладок для course-details.html");
    let currentTab: string = 'unknown_tab';
    const activeTabButton = document.querySelector('.tabs .tablink.w3-white');
    if (activeTabButton) {
      currentTab = activeTabButton.getAttribute('data-tabname') || 'unknown_tab';
    }

    document.body.addEventListener('click', (event: MouseEvent) => {
      const tabButton: HTMLElement | null = (event.target as HTMLElement).closest('[data-tabname]');
      if (!tabButton) return;

      const toTab: string | null = tabButton.getAttribute('data-tabname');
      if (toTab === currentTab) return;

      const eventData: NavigationEvent = {
        fromTab: currentTab,
        toTab: toTab || 'unknown_tab',
        scroll_perc: Math.round(analyticsState.scrollDepth_perc),
        timestamp: new Date().toISOString(),
      };

      analyticsState.navigationPath.push(eventData);
      console.log('Переход по вкладке:', eventData);
      currentTab = toTab || 'unknown_tab';
    });

    window.addEventListener('beforeunload', () => {
      analyticsState.finalAction = `close_on_tab_${currentTab}`;
    });
  }

  window.addEventListener('beforeunload', () => {
    const now: number = Date.now();
    sectionEntryTimes.forEach((entryTime: number, sectionName: string) => {
      const duration: number = now - entryTime;
      const currentTotal: number = analyticsState.sectionViewTimes[sectionName] || 0;
      analyticsState.sectionViewTimes[sectionName] = currentTotal + duration;
    });

    for (const sectionName in analyticsState.sectionViewTimes) {
        analyticsState.sectionViewTimes[sectionName] = parseFloat((analyticsState.sectionViewTimes[sectionName] / 1000).toFixed(1));
    }

    analyticsState.timeSpent_sec = Math.round((now - (analyticsState.startTime || now)) / 1000);
    analyticsState.scrollDepth_perc = Math.round(analyticsState.scrollDepth_perc);

    sendData(analyticsState);
  });
}

/**
 * Отправляет собранные данные на сервер.
 */
function sendData(data: TrackerData): void {
  const MIN_TIME_SPENT_SEC = 3;
  if (data.timeSpent_sec < MIN_TIME_SPENT_SEC) {
    console.log(`Сессия слишком короткая (${data.timeSpent_sec} сек). Данные не отправлены.`);
    return;
  }

  const webhookUrl: string = __API_BASE_URL__ + '/api/track';

  try {
    fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      keepalive: true,
    });
    console.log("Данные для отправки через Fetch API:", data);
  } catch (error: any) {
    console.error("Ошибка при отправке данных через fetch:", error);
  }
}

/**
 * Главная функция инициализации трекера.
 */
function initTracker(): void {
  const pageNameTag: HTMLMetaElement | null = document.querySelector('meta[name="page-name"]');
  const pageVariantTag: HTMLMetaElement | null = document.querySelector('meta[name="page-variant"]');

  analyticsState.pageName = pageNameTag ? pageNameTag.content : 'unknown';
  analyticsState.pageVariant = pageVariantTag ? pageVariantTag.content : 'unknown';

  console.log(`Трекер запущен на странице: ${analyticsState.pageName} (вариант: ${analyticsState.pageVariant})`);

  analyticsState.userId = getOrSetUserId();
  startMetricsCollection();
  initSectionViewTimeObserver();

  // Generalize form link handling
  const formLinks: NodeListOf<HTMLAnchorElement> = document.querySelectorAll('a[href*="form.html"][data-analytics-action]');
  formLinks.forEach(formLink => {
    if (analyticsState.userId) {
      const originalHref = formLink.getAttribute('href');
      if (originalHref && !originalHref.includes('userId=')) {
        const separator = originalHref.includes('?') ? '&' : '?';
        formLink.href = `${originalHref}${separator}userId=${analyticsState.userId}`;
        formLink.removeAttribute('target');
        console.log('Ссылка на анкету обновлена:', formLink.href);
      }

      formLink.addEventListener('click', () => {
        const eventData: NavigationEvent = {
          action: formLink.getAttribute('data-analytics-action') || 'clicked_form_link',
          fromPage: analyticsState.pageName,
          timestamp: new Date().toISOString(),
          fromTab: analyticsState.pageName, // Add fromTab for consistency
          toTab: 'form_page', // Add toTab for consistency
          scroll_perc: Math.round(analyticsState.scrollDepth_perc), // Add scroll_perc for consistency
        };
        analyticsState.navigationPath.push(eventData);
        console.log('Зафиксирован клик по ссылке на анкету:', eventData);
      });
    }
  });
}

// Запускаем трекер после полной загрузки страницы
window.addEventListener('load', initTracker);
