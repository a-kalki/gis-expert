document.addEventListener('DOMContentLoaded', () => {
  const tabScrollPositions = {};
  let currentTabId = 'about-of-course'; // Вкладка по умолчанию

  function openTab(tabName) {
    // 1. Сохраняем текущую позицию прокрутки для старой вкладки
    const currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    tabScrollPositions[currentTabId] = currentScrollPosition;

    // 2. Скрываем весь контент вкладок
    const tabcontent = document.getElementsByClassName("tabcontent");
    for (let i = 0; i < tabcontent.length; i++) {
      tabcontent[i].style.display = "none";
    }

    // 3. Снимаем класс "active" со всех кнопок
    const allTablinks = document.getElementsByClassName("tablink");
    for (let i = 0; i < allTablinks.length; i++) {
      allTablinks[i].classList.remove("w3-white");
    }
    
    // 4. Показываем новый контент и активируем нужные кнопки
    const newTabContent = document.getElementById(tabName);
    const newTabButtons = document.querySelectorAll(`.tablink[data-tabname='${tabName}']`);

    if (newTabContent) {
      newTabContent.style.display = "block";
    }
    newTabButtons.forEach(button => button.classList.add("w3-white"));

    // 5. Восстанавливаем позицию прокрутки для новой вкладки
    const newScrollPosition = tabScrollPositions[tabName] || 0;
    window.scrollTo({
      top: newScrollPosition,
      behavior: 'auto' // Используем auto для мгновенного перехода
    });
    
    // 6. Обновляем ID текущей вкладки
    currentTabId = tabName;
  }

  // Используем делегирование событий для обработки кликов по вкладкам
  const tabContainers = document.querySelectorAll('.tabs');
  tabContainers.forEach(container => {
    container.addEventListener('click', (event) => {
      const tabButton = event.target.closest('.tablink[data-tabname]');
      if (tabButton) {
        const tabName = tabButton.getAttribute('data-tabname');
        openTab(tabName);
      }
    });
  });

  // Плавный скролл для кнопки "Наверх"
  const toTopBtn = document.querySelector('.footer-button[href="#top"]');
  if(toTopBtn) {
    toTopBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
});
