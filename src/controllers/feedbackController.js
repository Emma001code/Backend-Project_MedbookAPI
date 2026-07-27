const { loadLocale, formatToday, escapeHtml } = require('../services/localeService');

// GET /feedback — course feedback form with i18n/l10n
async function showFeedbackForm(req, res, next) {
  try {
    const lang = req.query.lang === 'fr' ? 'fr' : 'en';
    const locale = await loadLocale(lang);
    const today = formatToday(lang);

    const questionsHtml = locale.questions
      .map((question, index) => {
        const answer = locale.answers?.[index] || '';
        return `
        <div class="question">
          <label for="q${index + 1}">${index + 1}. ${escapeHtml(question)}</label>
          <textarea id="q${index + 1}" name="q${index + 1}" rows="4" readonly>${escapeHtml(answer)}</textarea>
        </div>`;
      })
      .join('');

    const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(locale.pageTitle)}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; }
    h1 { margin-bottom: 0.5rem; }
    .instructions { margin-bottom: 1rem; color: #444; }
    .date { margin-bottom: 1.5rem; font-weight: bold; }
    .question { margin-bottom: 1.25rem; }
    label { display: block; margin-bottom: 0.5rem; font-weight: 600; }
    textarea { width: 100%; box-sizing: border-box; padding: 0.5rem; }
    textarea[readonly] { background: #f7f7f7; color: #333; resize: none; cursor: default; }
    .lang-links { margin-top: 2rem; font-size: 0.9rem; }
  </style>
</head>
<body>
  <h1>${escapeHtml(locale.pageTitle)}</h1>
  <p class="instructions">${escapeHtml(locale.instructions)}</p>
  <p class="date">${escapeHtml(locale.dateLabel)}: ${escapeHtml(today)}</p>
  <form>
    ${questionsHtml}
  </form>
  <p class="lang-links">
    <a href="/feedback">English</a> |
    <a href="/feedback?lang=fr">Francais</a>
  </p>
</body>
</html>`;

    res.type('html').send(html);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  showFeedbackForm,
};
