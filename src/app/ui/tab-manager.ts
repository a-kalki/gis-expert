const tabScrollPositions: Record<string, number> = {};

let currentTabId: string = 'unknown_tab';
const pageNameTag: HTMLMetaElement | null = document.querySelector('meta[name="page-name"]');
if (pageNameTag?.content === 'mission') {
  currentTabId = 'mission';
} else if (pageNameTag?.content === 'course-details') {
  currentTabId = 'about-of-course';
}

function openTab(tabName: string) {
  // 1. Сохраняем текущую позицию прокрутки
  const currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
  tabScrollPositions[currentTabId] = currentScrollPosition;

  // 2. Скрываем весь контент вкладок
  const tabcontents = document.getElementsByClassName("tabcontent");
  for (let i = 0; i < tabcontents.length; i++) {
    (tabcontents[i] as HTMLElement).style.display = "none";
  }

  // 3. Снимаем активный класс со всех кнопок
  const allTablinks = document.getElementsByClassName("tablink");
  for (let i = 0; i < allTablinks.length; i++) {
    allTablinks[i].classList.remove("w3-white");
  }

  // 4. Показываем новый контент и активируем кнопки
  const newTabContent = document.getElementById(tabName);
  const newTabButtons = document.querySelectorAll(`.tablink[data-tabname='${tabName}']`);

  if (newTabContent) {
    newTabContent.style.display = "block";
  }
  newTabButtons.forEach(button => button.classList.add("w3-white"));

  // 5. Восстанавливаем позицию прокрутки
  const newScrollPosition = tabScrollPositions[tabName] || 0;
  window.scrollTo({
    top: newScrollPosition,
    behavior: 'auto'
  });

  // 6. Обновляем ID текущей вкладки
  currentTabId = tabName;
}

function showToolbarScroll() {
  // Находим ВСЕ контейнеры с вкладками на странице
  const tabsContainers = document.querySelectorAll('.scrollable-tabs');

  tabsContainers.forEach((tabsContainer) => {
    function checkOverflow() {
      const containerWidth = tabsContainer.clientWidth;
      const contentWidth = tabsContainer.scrollWidth;
      const isOverflowing = contentWidth > containerWidth + 1;
      
      if (isOverflowing) {
        tabsContainer.classList.add('show-scrollbar');
      } else {
        tabsContainer.classList.remove('show-scrollbar');
      }
    }

    // Проверяем при загрузке страницы
    setTimeout(checkOverflow, 50);
    setTimeout(checkOverflow, 200);

    // Проверяем при изменении размера окна
    window.addEventListener('resize', checkOverflow);
  });
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
  // Автоматически определяем первую вкладку
  const firstTab = document.querySelector('.tabcontent[style*="display:block"]');
  if (firstTab) {
    currentTabId = firstTab.id;
  }

  // Обработчик кликов по вкладкам для ВСЕХ контейнеров
  const tabContainers = document.querySelectorAll('.tabs');
  tabContainers.forEach(container => {
    container.addEventListener('click', (event: Event) => {
      const tabButton = (event.target as Element).closest('.tablink[data-tabname]');
      if (tabButton) {
        const tabName = tabButton.getAttribute('data-tabname');
        if (tabName) {
          openTab(tabName);
        }
      }
    });
  });

  // Показываем скроллбар для ВСЕХ вкладок на странице
  showToolbarScroll();

  // Плавный скролл для кнопки "Наверх"
  const toTopBtn = document.querySelector('.footer-button[href="#top"]');
  if (toTopBtn) {
    toTopBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
});
