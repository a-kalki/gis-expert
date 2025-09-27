function initializeChat() {
    const chatForm = document.getElementById('chat-form') as HTMLFormElement;
    const chatInput = document.getElementById('chat-input') as HTMLInputElement;
    const chatMessages = document.getElementById('chat-messages') as HTMLDivElement;

    if (!chatForm || !chatInput || !chatMessages) {
        console.log('Chat UI elements not found. Chat will not be initialized.');
        return;
    }

    // Используем универсальный User ID
    const userId = window.UserIdManager.getOrCreateUserId();

    // Функция для восстановления истории из localStorage
    function loadChatHistory(): void {
        const savedHistory = localStorage.getItem(window.UserIdManager.getChatHistoryKey());
        if (savedHistory) {
            try {
                const history = JSON.parse(savedHistory);
                const recentHistory = history.slice(-10);
                
                recentHistory.forEach((msg: { role: string; content: string }) => {
                    appendMessage(msg.content, msg.role as 'user' | 'assistant');
                });
            } catch (error) {
                console.error('Error loading chat history:', error);
                localStorage.removeItem(window.UserIdManager.getChatHistoryKey());
            }
        }
    }

    // Функция для сохранения сообщения в историю
    function saveMessageToHistory(content: string, role: 'user' | 'assistant'): void {
        const key = window.UserIdManager.getChatHistoryKey();
        const existingHistory = localStorage.getItem(key);
        const messages = existingHistory ? JSON.parse(existingHistory) : [];
        
        messages.push({ role, content, timestamp: Date.now() });
        
        // Сохраняем только последние 20 сообщений
        const trimmedHistory = messages.slice(-20);
        localStorage.setItem(key, JSON.stringify(trimmedHistory));
    }

    // Загружаем историю при инициализации
    loadChatHistory();

    chatForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const userQuestion = chatInput.value.trim();

        if (!userQuestion) return;

        // 1. Отобразить вопрос пользователя
        appendMessage(userQuestion, 'user');
        saveMessageToHistory(userQuestion, 'user');
        
        chatInput.value = '';
        chatInput.disabled = true;

        // 2. Показать индикатор загрузки
        const loadingIndicator = appendMessage('Думаю...', 'assistant', true);

        try {
            // 3. Отправить запрос на сервер с универсальным userId
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

            loadingIndicator.querySelector('p')!.textContent = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                fullResponse += chunk;
                loadingIndicator.querySelector('p')!.textContent = fullResponse;
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }

            // Сохраняем ответ ассистента в историю
            saveMessageToHistory(fullResponse, 'assistant');

        } catch (error) {
            console.error('Chat error:', error);
            const errorMessage = 'Ой, что-то пошло не так. Попробуйте еще раз.';
            loadingIndicator.querySelector('p')!.textContent = errorMessage;
            saveMessageToHistory(errorMessage, 'assistant');
        } finally {
            chatInput.disabled = false;
            chatInput.focus();
        }
    });

    function appendMessage(text: string, sender: 'user' | 'assistant', isLoading = false): HTMLDivElement {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');

        const p = document.createElement('p');
        p.textContent = text;
        
        if (sender === 'user') {
            messageElement.classList.add('user-message');
        } else {
            messageElement.classList.add('assistant-message');
        }

        if (isLoading) {
            messageElement.classList.add('loading-indicator');
        }

        messageElement.appendChild(p);
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return messageElement;
    }

    // Добавляем кнопку очистки истории (опционально)
    addClearHistoryButton();
}

function addClearHistoryButton(): void {
    const clearBtn = document.createElement('button');
    clearBtn.textContent = '🗑️ Очистить историю';
    clearBtn.style.cssText = `
        position: fixed;
        bottom: 10px;
        right: 10px;
        z-index: 1000;
        padding: 5px 10px;
        font-size: 12px;
        background: #f0f0f0;
        border: 1px solid #ccc;
        border-radius: 3px;
        cursor: pointer;
    `;
    
    clearBtn.addEventListener('click', () => {
        if (confirm('Очистить историю чата?')) {
            localStorage.removeItem(window.UserIdManager.getChatHistoryKey());
            location.reload();
        }
    });
    
    document.body.appendChild(clearBtn);
}

document.addEventListener('DOMContentLoaded', initializeChat);
