const fs = require('fs/promises');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../../locales');
const LOCALE_FILES = {
  en: 'english.json',
  fr: 'french.json',
};
const SUPPORTED_LOCALES = {
  en: 'en-GB',
  fr: 'fr-FR',
};

async function loadLocale(lang) {
  const code = lang === 'fr' ? 'fr' : 'en';
  const filePath = path.join(LOCALES_DIR, LOCALE_FILES[code]);
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

function formatToday(lang) {
  const locale = SUPPORTED_LOCALES[lang === 'fr' ? 'fr' : 'en'];
  return new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(new Date());
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = {
  loadLocale,
  formatToday,
  escapeHtml,
};
