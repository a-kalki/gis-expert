import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { Window } from 'happy-dom';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Регистрируем happy-dom глобально
GlobalRegistrator.register();

const __dirname = dirname(fileURLToPath(import.meta.url));

export function createTestWindow(html: string): Window {
  const window = new Window();
  window.document.write(html);
  
  // Глобальные переменные для тестов
  (global as any).window = window;
  (global as any).document = window.document;
  (global as any).HTMLElement = window.HTMLElement;
  (global as any).HTMLFormElement = window.HTMLFormElement;
  (global as any).HTMLInputElement = window.HTMLInputElement;
  (global as any).Event = window.Event;
  (global as any).URLSearchParams = URLSearchParams;
  
  return window;
}

export function loadFormHTML(): string {
  try {
    const htmlPath = join(__dirname, '../src/ui/form.html');
    const htmlContent = readFileSync(htmlPath, 'utf-8');
    
    const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const bodyContent = bodyMatch && bodyMatch[1] ? bodyMatch[1].trim() : htmlContent;
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    .w3-border-red { border: 2px solid red !important; }
    .validation-error { color: red; font-size: 12px; display: block; margin-top: 5px; }
  </style>
</head>
<body>${bodyContent}</body>
</html>`;
  } catch (error) {
    throw new Error(`Failed to load form HTML: ${error.message}`);
  }
}
