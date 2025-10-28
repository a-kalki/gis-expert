const projectRoot = process.cwd();
module.exports = {
  apps : [{
    name: "it-course-landing", // Имя вашего приложения
    script: "./src/app/server.ts",             // Исполняемый файл
    interpreter: "bun",        // Указываем, что скрипт должен запускаться через Bun
    args: "start:prod",        // Скрипт из package.json
    cwd: projectRoot,          // Укажите абсолютный путь к корневой директории вашего проекта
    instances: 1,              // Количество экземпляров приложения
    autorestart: true,         // Автоматический перезапуск при сбое
    watch: false,              // Отключить watch в продакшене
    max_memory_restart: "1G",  // Перезапуск, если потребление памяти превысит 1GB
    env_production: {
      NODE_ENV: "production",
      PORT: "3101",
    }
 }]
};
