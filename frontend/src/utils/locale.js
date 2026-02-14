const KEY = 'ui_locale';

export const getUiLocale = () => localStorage.getItem(KEY) || 'en';
export const setUiLocale = (locale) => localStorage.setItem(KEY, locale);
