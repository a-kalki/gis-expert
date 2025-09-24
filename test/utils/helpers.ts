export function fillFormField(form: HTMLFormElement, name: string, value: string | string[]): void {
  if (Array.isArray(value)) {
    value.forEach(val => {
      const input = form.querySelector(`[name="${name}"][value="${val}"]`) as HTMLInputElement;
      if (input) input.checked = true;
    });
  } else {
    const input = form.querySelector(`[name="${name}"]`) as HTMLInputElement;
    if (input) {
      if (input.type === 'checkbox' || input.type === 'radio') {
        input.checked = true;
      } else {
        input.value = value;
      }
    }
  }
}

export function hasValidationError(element: HTMLElement): boolean {
  return !!element.querySelector('.validation-error');
}

export function getValidationErrorText(element: HTMLElement): string {
  const errorElement = element.querySelector('.validation-error');
  return errorElement?.textContent?.trim() || '';
}
