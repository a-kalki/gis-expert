class UserIdManager {
    private static readonly STORAGE_KEY = "it-course-user-id";
    private static readonly CHAT_HISTORY_PREFIX = "chatHistory_";
    private static readonly LAST_ACTIVITY_KEY = "lastChatActivity";
    private static readonly SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 минут
    
    static getOrCreateUserId(): string {
        let userId = localStorage.getItem(this.STORAGE_KEY);
        if (!userId) {
            const randomBytes = new Uint8Array(8);
            window.crypto.getRandomValues(randomBytes);
            userId = Array.from(randomBytes).map((byte) => 
                byte.toString(16).padStart(2, "0")
            ).join("");
            localStorage.setItem(this.STORAGE_KEY, userId);
            console.log("Сгенерирован новый универсальный User ID:", userId);
        }
        return userId;
    }

    static getUserId(): string | null {
        return localStorage.getItem(this.STORAGE_KEY);
    }

    static getChatHistoryKey(): string {
        return `${this.CHAT_HISTORY_PREFIX}${this.getOrCreateUserId()}`;
    }

    static clearUserData(): void {
        const userId = this.getUserId();
        if (userId) {
            localStorage.removeItem(`${this.CHAT_HISTORY_PREFIX}${userId}`);
            localStorage.removeItem(this.STORAGE_KEY);
        }
    }

    static hasUserId(): boolean {
        return !!localStorage.getItem(this.STORAGE_KEY);
    }

    static cleanupExpiredHistory(): void {
        const lastActivity = localStorage.getItem(this.LAST_ACTIVITY_KEY);
        const now = Date.now();

        if (!lastActivity) {
            this.updateLastActivity();
            return;
        }

        // Если прошло больше 30 минут - очищаем историю
        if (now - parseInt(lastActivity) > this.SESSION_TIMEOUT_MS) {
            const userId = this.getUserId();
            if (userId) {
                localStorage.removeItem(`${this.CHAT_HISTORY_PREFIX}${userId}`);
                console.log("Автоочистка: история чата сброшена по таймауту");
            }
        }

        this.updateLastActivity();
    }

    static updateLastActivity(): void {
        localStorage.setItem(this.LAST_ACTIVITY_KEY, Date.now().toString());
    }

    static getTimeUntilCleanup(): number {
        const lastActivity = localStorage.getItem(this.LAST_ACTIVITY_KEY);
        if (!lastActivity) return this.SESSION_TIMEOUT_MS;

        const elapsed = Date.now() - parseInt(lastActivity);
        return Math.max(0, this.SESSION_TIMEOUT_MS - elapsed);
    }
}

// Делаем класс доступным глобально для других скриптов
declare global {
    interface Window {
        UserIdManager: typeof UserIdManager;
    }
}

window.UserIdManager = UserIdManager;
