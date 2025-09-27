document.addEventListener('DOMContentLoaded', () => {
  const tabScrollPositions: { [key: string]: number } = {};
  let currentTabId: string = 'about-of-course'; // Вкладка по умолчанию

  function openTab(tabName: string): void {
    // 1. Сохраняем текущую позицию прокрутки для старой вкладки
    const currentScrollPosition: number = window.pageYOffset || document.documentElement.scrollTop;
    tabScrollPositions[currentTabId] = currentScrollPosition;

    // 2. Скрываем весь контент вкладок
    const tabcontent: HTMLCollectionOf<Element> = document.getElementsByClassName("tabcontent");
    for (let i = 0; i < tabcontent.length; i++) {
      (tabcontent[i] as HTMLElement).style.display = "none";
    }

    // 3. Снимаем класс "active" со всех кнопок
    const allTablinks: HTMLCollectionOf<Element> = document.getElementsByClassName("tablink");
    for (let i = 0; i < allTablinks.length; i++) {
      allTablinks[i].classList.remove("w3-white");
    }

    // 4. Показываем новый контент и активируем нужные кнопки
    const newTabContent: HTMLElement | null = document.getElementById(tabName);
    const newTabButtons: NodeListOf<Element> = document.querySelectorAll(`.tablink[data-tabname='${tabName}']`);

    if (newTabContent) {
      newTabContent.style.display = "block";
    }
    newTabButtons.forEach((button: Element) => button.classList.add("w3-white"));

    // 5. Восстанавливаем позицию прокрутки для новой вкладки
    const newScrollPosition: number = tabScrollPositions[tabName] || 0;
    window.scrollTo({
      top: newScrollPosition,
      behavior: 'auto' // Используем auto для мгновенного перехода
    });

    // 6. Обновляем ID текущей вкладки
    currentTabId = tabName;
  }

  // Используем делегирование событий для обработки кликов по вкладкам
  const tabContainers: NodeListOf<Element> = document.querySelectorAll('.tabs');
  tabContainers.forEach((container: Element) => {
    container.addEventListener('click', (event: MouseEvent) => {
      const tabButton: Element | null = (event.target as HTMLElement).closest('.tablink[data-tabname]');
      if (tabButton) {
        const tabName: string | null = tabButton.getAttribute('data-tabname');
        if (tabName) { // Ensure tabName is not null
          openTab(tabName);
        }
      }
    });
  });

  // Плавный скролл для кнопки "Наверх"
  const toTopBtn: Element | null = document.querySelector('.footer-button[href="#top"]');
  if(toTopBtn) {
    toTopBtn.addEventListener('click', (e: MouseEvent) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
});
