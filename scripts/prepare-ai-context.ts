import { Window } from 'happy-dom';
import { promises as fs } from 'fs';
import path from 'path';

const projectRoot = process.cwd();
const courseDetailsHtmlPath = path.join(projectRoot, 'src', 'ui', 'details.html');
const contextOutputPath = path.join(projectRoot, 'src', 'api', 'ai', 'ai-context.txt');

async function extractTextFromHtml(filePath: string): Promise<string> {
    const htmlContent = await fs.readFile(filePath, 'utf-8');
    
    const window = new Window();
    const document = window.document;
    document.body.innerHTML = htmlContent;

    // Удаляем скрипты и стили, чтобы они не попали в контекст
    document.querySelectorAll('script, style').forEach(element => element.remove());

    let extractedText = '';

    const processNode = (node: any) => {
        let result = '';
        node.querySelectorAll('h1, h2, h3, p, li, a, span, blockquote, div').forEach((el: any) => {
            // Пропускаем вложенные tabcontent, чтобы избежать дублирования
            if (el.classList.contains('tabcontent')) {
                return;
            }

            // Пропускаем footer-button, чтобы не дублировать кнопку "наверх"
            if (el.classList.contains('footer-button')) {
                return;
            }

            const text = el.textContent?.trim();
            // Для ссылок `a` разрешаем быть пустыми, если у них есть href (например, иконки)
            if (!text && el.tagName.toLowerCase() !== 'a') return;

            let formattedLine = '';
            const tagName = el.tagName.toLowerCase();

            switch (tagName) {
                case 'h1':
                    formattedLine = `# ${text}`;
                    break;
                case 'h2':
                    formattedLine = `## ${text}`;
                    break;
                case 'h3':
                    formattedLine = `### ${text}`;
                    break;
                case 'li':
                    const parent = el.parentElement;
                    if (parent && parent.tagName.toLowerCase() === 'ol') {
                        const index = Array.from(parent.children).indexOf(el) + 1;
                        formattedLine = `${index}. ${text}`;
                    } else {
                        formattedLine = `* ${text}`;
                    }
                    break;
                case 'p':
                case 'div':
                     // Проверяем, что у div нет дочерних элементов, которые мы уже обрабатываем,
                     // чтобы избежать дублирования текста.
                    if (tagName === 'div' && el.querySelector('h1, h2, h3, p, li, a, span, blockquote')) {
                       return;
                    }
                    formattedLine = text;
                    break;
                case 'a':
                    const href = el.getAttribute('href');
                    if (href) {
                        formattedLine = `[${text}](${href})`;
                    } else {
                        formattedLine = text;
                    }
                    break;
                case 'blockquote':
                    formattedLine = `> ${text.replace(/\n/g, '\n> ')}`;
                    break;
                default:
                    if (el.parentElement?.tagName.toLowerCase() !== 'p') {
                         formattedLine = text;
                    }
                    break;
            }
            
            if(formattedLine) {
                result += formattedLine + '\n\n';
            }
        });
        return result;
    }

    // 1. Обрабатываем Header
    const header = document.querySelector('header');
    if (header) {
        extractedText += `--- НАЧАЛО HEADER ---\n\n`;
        extractedText += processNode(header);
    }

    // 2. Обрабатываем вкладки
    const tabContents = document.querySelectorAll('.tabcontent');
    tabContents.forEach(tabContent => {
        const tabId = tabContent.id;
        const tabLink = document.querySelector(`.tablink[data-tabname="${tabId}"]`);
        const tabName = tabLink ? tabLink.textContent?.trim() : 'Неизвестная вкладка';

        extractedText += `--- НАЧАЛО ВКЛАДКИ: ${tabName} ---\n\n`;
        extractedText += processNode(tabContent);
    });

    // 3. Обрабатываем Footer
    const footer = document.querySelector('footer');
    if (footer) {
        extractedText += `--- НАЧАЛО FOOTER ---\n\n`;
        extractedText += processNode(footer);
    }

    // Простое удаление лишних пустых строк
    return extractedText.replace(/\n{3,}/g, '\n\n').trim();
}

async function main() {
    try {
        console.log(`Reading content from ${courseDetailsHtmlPath}...`);
        const textContent = await extractTextFromHtml(courseDetailsHtmlPath);
        
        await fs.writeFile(contextOutputPath, textContent, 'utf-8');
        console.log(`✅ AI context has been successfully generated at ${contextOutputPath}`);
        console.log(`\nPreview of the context:\n---`);
        console.log(textContent.substring(0, 400) + '...');
        console.log('---');

    } catch (error) {
        console.error('❌ An error occurred while generating the AI context:', error);
        process.exit(1);
    }
}

main();
