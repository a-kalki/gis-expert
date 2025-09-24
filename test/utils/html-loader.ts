import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export class HTMLLoader {
  private static templateCache: Map<string, string> = new Map();
  
  static loadFormHTML(variables: Record<string, string> = {}): string {
    const cacheKey = JSON.stringify(variables);
    
    if (!this.templateCache.has(cacheKey)) {
      const htmlPath = join(__dirname, '../../src/ui/form.html');
      const htmlContent = readFileSync(htmlPath, 'utf-8');
      
      this.templateCache.set(cacheKey, htmlContent);
    }
    
    return this.templateCache.get(cacheKey)!;
  }
}
