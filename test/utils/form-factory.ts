import { HTMLLoader } from './html-loader';
import { Window } from 'happy-dom';

export class FormFactory {
  static createFormWithData(formData: Record<string, any> = {}): { html: string; form: HTMLFormElement } {
    const html = HTMLLoader.loadFormHTML();
    const window = new Window();
    window.document.write(html);
    
    const form = window.document.getElementById('courseApplicationForm') as HTMLFormElement;
    
    this.fillFormData(window.document, formData);
    
    const updatedHTML = window.document.documentElement.outerHTML;
    
    return { html: updatedHTML, form };
  }
  
  static createValidForm(): { form: HTMLFormElement; window: Window } {
    const html = HTMLLoader.loadFormHTML();
    const window = new Window();
    window.document.write(html);
    
    const form = window.document.getElementById('courseApplicationForm') as HTMLFormElement;
    
    this.fillFormWithValidData(form);
    
    return { form, window };
  }
  
  private static fillFormWithValidData(form: HTMLFormElement): void {
    (form.querySelector('#name') as HTMLInputElement).value = 'Тестовый Пользователь';
    (form.querySelector('#phone') as HTMLInputElement).value = '+77001234567';
    
    (form.querySelector('[name="contactMethod"][value="Телефонный звонок"]') as HTMLInputElement).checked = true;
    (form.querySelector('[name="howFoundUs"][value="Инстаграм"]') as HTMLInputElement).checked = true;
    (form.querySelector('[name="whyInterested"][value="Решил попробовать из за бесплатных уроков"]') as HTMLInputElement).checked = true;
    (form.querySelector('[name="programmingExperience"][value="Я новичок, хочу начать"]') as HTMLInputElement).checked = true;
    (form.querySelector('[name="languageInterest"][value="Python: потому что он универсален (ИИ, веб, аналитика, ...)"]') as HTMLInputElement).checked = true;
    (form.querySelector('[name="learningFormat"][value="Онлайн: я живу в другом городе, а так бы выбрал офлайн"]') as HTMLInputElement).checked = true;
    (form.querySelector('[name="preferredDay"][value="Понедельник"]') as HTMLInputElement).checked = true;
    (form.querySelector('[name="preferredDay"][value="Вторник"]') as HTMLInputElement).checked = true;
    (form.querySelector('[name="preferredTime"][value="18-20 вечера"]') as HTMLInputElement).checked = true;
  }
  
  private static fillFormData(document: Document, formData: Record<string, any>): void {
    const form = document.getElementById('courseApplicationForm') as HTMLFormElement;
    if (!form) throw new Error('Form not found');
    
    const elements = Array.from(form.elements) as HTMLInputElement[];

    elements.forEach(element => {
      const name = element.name;
      if (!formData[name]) return;

      const value = formData[name];

      if (element.type === 'radio' || element.type === 'checkbox') {
        if (Array.isArray(value)) {
          if (value.includes(element.value)) {
            element.checked = true;
          }
        } else {
          if (element.value === value) {
            element.checked = true;
          }
        }
      } else if (element.type !== 'submit' && element.type !== 'reset') {
        if (!Array.isArray(value)) {
          element.value = value;
        }
      }
    });
  }
  
  static createEmptyForm(): { html: string; form: HTMLFormElement } {
    return this.createFormWithData();
  }
}
