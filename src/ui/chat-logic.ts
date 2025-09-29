import UserIdManager from './user-id-manager.js';

// Конфигурация эмодзи-анимаций
const EMOJI_ANIMATIONS = {
    'thinking': [' o_o ', ' -_- ', ' ◔_◔ ', ' ◕_◕ ', ' ￣ω￣ '],
    'happy': [' ^_^ ', ' ◡_◡ ', ' ≧◡≦ ', ' ★_★ ', ' ♥_♥ '],
    'clever': [' >_> ', ' ᓚ_ᗢ ', ' ¬_¬ ', '   シ ', ' ✌_✌ '],
    'sad': [' T_T ', ' •_• ']
};

// Тайминги анимации (мс)
const ANIMATION_CONFIG = {
    FRAME_DURATION: 600,
    INITIAL_DELAY: 1000
};

function initializeChat() {
    const chatForm = document.getElementById('chat-form') as HTMLFormElement;
    const chatInput = document.getElementById('chat-input') as HTMLInputElement;
    const chatMessages = document.getElementById('chat-messages') as HTMLDivElement;

    if (!chatForm || !chatInput || !chatMessages) {
        console.log('Chat UI elements not found. Chat will not be initialized.');
        return;
    }

    // Очищаем просроченную историю при загрузке
    UserIdManager.cleanupExpiredHistory();

    const userId = UserIdManager.getOrCreateUserId();

    // Обновляем время активности при любом взаимодействии
    function updateActivity() {
        UserIdManager.updateLastActivity();
    }

    // Функция для восстановления истории из localStorage
    function loadChatHistory(): void {
        const savedHistory = localStorage.getItem(UserIdManager.getChatHistoryKey());
        if (savedHistory) {
            try {
                const history = JSON.parse(savedHistory);
                const recentHistory = history.slice(-10); // Показываем последние 10 сообщений
                
                recentHistory.forEach((msg: { role: string; content: string }) => {
                    appendMessage(msg.content, msg.role as 'user' | 'assistant');
                });

                // Показываем уведомление о восстановленной истории
                showHistoryRestoredNotification();
            } catch (error) {
                console.error('Error loading chat history:', error);
                localStorage.removeItem(UserIdManager.getChatHistoryKey());
            }
        }
    }

    // Функция для сохранения сообщения в историю
    function saveMessageToHistory(content: string, role: 'user' | 'assistant'): void {
        const key = UserIdManager.getChatHistoryKey();
        const existingHistory = localStorage.getItem(key);
        const messages = existingHistory ? JSON.parse(existingHistory) : [];
        
        messages.push({ 
            role, 
            content, 
            timestamp: Date.now() 
        });
        
        // Сохраняем только последние 20 сообщений
        const trimmedHistory = messages.slice(-20);
        localStorage.setItem(key, JSON.stringify(trimmedHistory));
    }

    // Уведомление о восстановленной истории
    function showHistoryRestoredNotification(): void {
        const notification = document.createElement('div');
        notification.innerHTML = `
            <div style="
                background: #d4edda;
                border: 1px solid #c3e6cb;
                border-radius: 4px;
                padding: 8px 12px;
                margin: 10px;
                font-size: 12px;
                color: #155724;
            ">
                📚 Загружена предыдущая история чата. 
                <button onclick="this.parentElement.remove()" 
                style="background: none; border: none; color: #007bff; cursor: pointer; text-decoration: underline; margin-left: 5px;">
                Скрыть</button>
            </div>
        `;
        
        chatMessages.parentNode?.insertBefore(notification, chatMessages);
    }

    // Загружаем историю при инициализации
    loadChatHistory();

    // Обновляем активность при вводе текста
    chatInput.addEventListener('input', updateActivity);
    chatInput.addEventListener('focus', updateActivity);

    chatForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        updateActivity();
        
        const userQuestion = chatInput.value.trim();
        if (!userQuestion) return;

        // 1. Отобразить вопрос пользователя
        appendMessage(userQuestion, 'user');
        saveMessageToHistory(userQuestion, 'user');
        
        chatInput.value = '';
        chatInput.disabled = true;

        // 2. Показать индикатор загрузки с анимацией
        const loadingIndicator = appendMessage('Думаю...', 'assistant', true);

        try {
            // 3. Отправить запрос на сервер
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    question: userQuestion, 
                    userId: userId 
                }),
            });

            if (!response.ok || !response.body) {
                throw new Error(`Server error: ${response.statusText}`);
            }
            
            // 4. Обработать потоковый ответ
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullResponse = '';

            // Останавливаем анимацию эмодзи и убираем индикатор
            stopEmojiAnimation(loadingIndicator);
            removeEmojiIndicator(loadingIndicator);

            // Очищаем текст "Думаю..." и начинаем вывод ответа
            const contentP = loadingIndicator.querySelector('p')!;
            contentP.textContent = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                fullResponse += chunk;
                contentP.textContent = fullResponse;
                
                // Скроллим к низу во время потоковой передачи
                scrollToBottom();
            }

            // Финальный скролл после завершения
            scrollToBottom();

            // Сохраняем ответ ассистента в историю
            saveMessageToHistory(fullResponse, 'assistant');

        } catch (error) {
            console.error('Chat error:', error);
            const errorMessage = 'Ой, что-то пошло не так. Попробуйте еще раз.';
            
            // Останавливаем анимацию при ошибке
            stopEmojiAnimation(loadingIndicator);
            removeEmojiIndicator(loadingIndicator);
            
            loadingIndicator.querySelector('p')!.textContent = errorMessage;
            saveMessageToHistory(errorMessage, 'assistant');
            
            // Скроллим к ошибке
            scrollToBottom();
        } finally {
            chatInput.disabled = false;
            chatInput.focus();
        }
    });

    // Вспомогательные функции для управления анимацией (без изменений)
    function stopEmojiAnimation(messageElement: HTMLDivElement): void {
        const intervalId = (messageElement as any)._emojiInterval;
        if (intervalId) {
            clearInterval(intervalId);
            (messageElement as any)._emojiInterval = null;
        }
    }

    function removeEmojiIndicator(messageElement: HTMLDivElement): void {
        const emojiIndicator = (messageElement as any)._emojiIndicator;
        if (emojiIndicator && emojiIndicator.parentNode) {
            emojiIndicator.parentNode.removeChild(emojiIndicator);
        }
    }

    function appendMessage(text: string, sender: 'user' | 'assistant', isLoading = false): HTMLDivElement {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');

        // Контейнер для содержимого сообщения
        const contentContainer = document.createElement('div');
        contentContainer.style.display = 'flex';
        contentContainer.style.alignItems = 'flex-start';
        contentContainer.style.gap = '10px';

        // Эмодзи-индикатор (только для ассистента при загрузке)
        let emojiIndicator: HTMLSpanElement | null = null;
        let emojiInterval: number | null = null;

        if (sender === 'assistant' && isLoading) {
            emojiIndicator = document.createElement('span');
            emojiIndicator.style.cssText = `
                font-size: 16px;
                min-width: 30px;
                height: 20px;
                display: inline-block;
                text-align: center;
            `;
            contentContainer.appendChild(emojiIndicator);
        }

        const p = document.createElement('p');
        p.textContent = text;
        p.style.margin = '0';
        p.style.flex = '1';
        
        contentContainer.appendChild(p);
        messageElement.appendChild(contentContainer);

        if (sender === 'user') {
            messageElement.classList.add('user-message');
        } else {
            messageElement.classList.add('assistant-message');
        }

        if (isLoading) {
            messageElement.classList.add('loading-indicator');
            
            // Запускаем анимацию эмодзи
            if (emojiIndicator) {
                startEmojiAnimation(emojiIndicator, 'thinking');
            }
        }

        const chatMessages = document.getElementById('chat-messages') as HTMLDivElement;
        chatMessages.appendChild(messageElement);
        
        // Автоматический скролл к низу при добавлении сообщения
        scrollToBottom();
        
        // Сохраняем ссылки для очистки
        if (emojiInterval) {
            (messageElement as any)._emojiInterval = emojiInterval;
        }
        (messageElement as any)._emojiIndicator = emojiIndicator;

        return messageElement;
    }

    // Функция для скролла к низу контейнера
    function scrollToBottom(): void {
        const chatMessages = document.getElementById('chat-messages') as HTMLDivElement;
        // Небольшая задержка для гарантии что DOM обновился
        setTimeout(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 10);
    }

    // Функция анимации эмодзи
    function startEmojiAnimation(emojiElement: HTMLSpanElement, mood: keyof typeof EMOJI_ANIMATIONS): number {
        const frames = EMOJI_ANIMATIONS[mood];
        let currentFrame = 0;
        
        emojiElement.textContent = frames[currentFrame];
        
        return window.setInterval(() => {
            currentFrame = (currentFrame + 1) % frames.length;
            emojiElement.textContent = frames[currentFrame];
        }, ANIMATION_CONFIG.FRAME_DURATION);
    }

    // Добавляем кнопку очистки истории
    addClearHistoryButton();

    // Запускаем периодическую проверку очистки (каждые 5 минут)
    setInterval(() => {
        UserIdManager.cleanupExpiredHistory();
    }, 5 * 60 * 1000);

    // Показываем таймер до очистки (опционально)
    showCleanupTimer();
}

function addClearHistoryButton(): void {
    // Проверяем, не добавлена ли кнопка уже
    if (document.getElementById('clear-chat-history-btn')) return;

    const clearBtn = document.createElement('button');
    clearBtn.id = 'clear-chat-history-btn';
    clearBtn.textContent = '🗑️ Очистить историю';
    clearBtn.style.cssText = `
        position: fixed;
        bottom: 60px;
        right: 10px;
        z-index: 1000;
        padding: 5px 10px;
        font-size: 12px;
        background: #f8f9fa;
        border: 1px solid #dee2e6;
        border-radius: 3px;
        cursor: pointer;
        color: #6c757d;
    `;
    
    clearBtn.addEventListener('click', () => {
        if (confirm('Очистить историю чата? Это действие нельзя отменить.')) {
            localStorage.removeItem(UserIdManager.getChatHistoryKey());
            localStorage.removeItem('lastChatActivity');
            location.reload();
        }
    });
    
    document.body.appendChild(clearBtn);
}

function showCleanupTimer(): void {
    const timeUntilCleanup = UserIdManager.getTimeUntilCleanup();
    const minutesLeft = Math.ceil(timeUntilCleanup / (60 * 1000));
    
    // Показываем таймер только если осталось меньше 10 минут
    if (minutesLeft < 10) {
        const timer = document.createElement('div');
        timer.id = 'chat-cleanup-timer';
        timer.innerHTML = `🕒 История сохранится еще ${minutesLeft} мин`;
        timer.style.cssText = `
            position: fixed;
            bottom: 30px;
            right: 10px;
            z-index: 1000;
            font-size: 11px;
            color: #6c757d;
            background: #f8f9fa;
            padding: 3px 8px;
            border-radius: 3px;
            border: 1px solid #dee2e6;
        `;
        
        document.body.appendChild(timer);

        // Обновляем таймер каждую минуту
        setInterval(() => {
            const newTimeLeft = UserIdManager.getTimeUntilCleanup();
            const newMinutesLeft = Math.ceil(newTimeLeft / (60 * 1000));
            
            if (newMinutesLeft <= 0) {
                timer.remove();
            } else {
                timer.textContent = `🕒 История сохранится еще ${newMinutesLeft} мин`;
            }
        }, 60 * 1000);
    }
}

document.addEventListener('DOMContentLoaded', initializeChat);
