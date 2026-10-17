/* Сборка команды из шаблона + экранирование под выбранную оболочку.
   Шаблон:      git commit --amend -m "{{message}}"
   Условный блок {{#name}} ... {{/name}} попадает в команду,
   только если параметр name заполнен (или флаг включён).

   Спецсимволы ниже собираются через String.fromCharCode, а шаблоны
   разбираются вручную (без регулярок) — так файл гарантированно
   не искажается при любой пересборке/перекодировке. */

const BK = String.fromCharCode(92);    /* обратная косая черта */
const TICK = String.fromCharCode(96);  /* обратный апостроф */
const NL = String.fromCharCode(10);    /* перевод строки */
const CR = String.fromCharCode(13);    /* возврат каретки */
const TAB = String.fromCharCode(9);    /* табуляция */

export const SHELLS = [
  { id: 'bash', label: 'Bash / zsh', hint: 'Linux, macOS, Git Bash, WSL' },
  { id: 'cmd', label: 'CMD', hint: 'Windows cmd.exe' },
  { id: 'powershell', label: 'PowerShell', hint: 'Windows PowerShell' },
];

/* Каждое вхождение символа ch заменяем на esc + ch (эквивалент replace с регэкспом). */
function escapeEach(str, ch, esc) {
  return str.split(ch).join(esc + ch);
}

/** Экранирование спецсимволов внутри двойных кавычек. */
export function escapeForShell(value, shell) {
  let v = String(value);
  if (shell === 'bash') {
    v = escapeEach(v, BK, BK);     /* сначала сам символ экранирования */
    v = escapeEach(v, '"', BK);
    v = escapeEach(v, TICK, BK);
    v = escapeEach(v, '$', BK);
    return v;
  }
  if (shell === 'powershell') {
    v = escapeEach(v, TICK, TICK); /* экранирующий символ — первым */
    v = escapeEach(v, '"', TICK);
    v = escapeEach(v, '$', TICK);
    return v;
  }
  /* CMD: парсер git.exe понимает кавычку с предшествующей косой чертой */
  return escapeEach(v, '"', BK);
}

/** В CMD/PowerShell перенос строки внутри команды невозможен — заменяем пробелом. */
function normalizeMultiline(value, shell) {
  const v = String(value);
  if (shell === 'bash') return v.split(CR + NL).join(NL);
  return v.split(CR + NL).join(' ').split(CR).join(' ').split(NL).join(' ');
}

const SAFE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_@.-/~{}';

function isUnquotedSafe(v) {
  if (v.length === 0) return false;
  for (let i = 0; i < v.length; i++) {
    if (SAFE_CHARS.indexOf(v.charAt(i)) < 0) return false;
  }
  return true;
}

/** Идентификаторы (ветки, remote, пути без пробелов) — без кавычек, остальное — в кавычках. */
export function quoteValue(value, shell) {
  const v = String(value).trim();
  if (v === '') return '""';
  return isUnquotedSafe(v) ? v : '"' + escapeForShell(v, shell) + '"';
}

export function defaultValues(params) {
  const values = {};
  for (const p of params) {
    if (p.type === 'flag') values[p.name] = false;
    else if (p.type === 'select') values[p.name] = p.default ?? p.options[0]?.value ?? '';
    else values[p.name] = p.default ?? '';
  }
  return values;
}

export function exampleValues(params) {
  const values = {};
  for (const p of params) {
    if (p.type === 'flag') values[p.name] = false;
    else if (p.type === 'select') values[p.name] = p.default ?? p.options[0]?.value ?? '';
    else values[p.name] = p.example ?? '';
  }
  return values;
}

/** Список незаполненных обязательных полей. */
export function missingRequired(params, values) {
  return params
    .filter((p) => p.required && p.type !== 'flag' && p.type !== 'select')
    .filter((p) => String(values[p.name] ?? '').trim() === '')
    .map((p) => p.label);
}

/** Значение плейсхолдера {{name}}. */
function placeholderValue(p, v, shell, forPreview) {
  if (!p) return '';
  const raw = v == null ? '' : String(v);
  if (p.type === 'flag') return v ? String(p.value ?? '') : '';
  if (p.type === 'select') return raw;
  if (p.type === 'number') return forPreview ? raw : raw.replace(/[^0-9]/g, '');
  if (p.type === 'text') {
    if (forPreview) return raw !== '' ? '"' + raw + '"' : '<' + p.label + '>';
    if (raw === '') return '';
    return '"' + escapeForShell(normalizeMultiline(raw, shell), shell) + '"';
  }
  /* тип raw: идентификаторы */
  if (forPreview) return raw !== '' ? raw : '<' + p.label + '>';
  return raw === '' ? '' : quoteValue(raw, shell);
}

/** Подстановка значений и условных блоков в шаблон — ручной разбор, без регулярок. */
function substitute(template, params, values, shell, forPreview) {
  const byName = new Map(params.map((p) => [p.name, p]));

  const isOn = (p, v) => {
    if (p && p.type === 'flag') return Boolean(v);
    return String(v ?? '').trim() !== '';
  };

  let out = '';
  let i = 0;
  while (i < template.length) {
    const open = template.indexOf('{{', i);
    if (open < 0) { out += template.slice(i); break; }
    out += template.slice(i, open);

    if (template.charAt(open + 2) === '#') {
      /* условный блок {{#name}} ... {{/name}} */
      const tagEnd = template.indexOf('}}', open);
      if (tagEnd < 0) { out += template.slice(open); break; }
      const name = template.slice(open + 3, tagEnd);
      const closeTag = '{{/' + name + '}}';
      const close = template.indexOf(closeTag, tagEnd);
      if (close < 0) { out += template.slice(open); break; }
      const body = template.slice(tagEnd + 2, close);
      if (isOn(byName.get(name), values[name])) {
        out += substitute(body, params, values, shell, forPreview);
      }
      i = close + closeTag.length;
    } else {
      const end = template.indexOf('}}', open);
      if (end < 0) { out += template.slice(open); break; }
      const name = template.slice(open + 2, end);
      out += placeholderValue(byName.get(name), values[name], shell, forPreview);
      i = end + 2;
    }
  }
  return out;
}

/** Итоговая команда с подставленными значениями. */
export function renderTemplate(template, params, values, shell) {
  return cleanOutsideQuotes(
    substitute(template, params, values, shell, false),
    shell === 'powershell' ? TICK : BK
  );
}

/** Превью команды на свёрнутой карточке: значения по умолчанию + <Подсказка> для пустых. */
export function previewTemplate(template, params) {
  const values = defaultValues(params);
  return cleanOutsideQuotes(substitute(template, params, values, null, true), BK);
}

/** Схлопывает лишние пробелы от пустых параметров — но только ВНЕ кавычек. */
function cleanOutsideQuotes(cmd, escChar) {
  let out = '';
  let inQuotes = false;
  let i = 0;
  while (i < cmd.length) {
    const ch = cmd.charAt(i);
    if (inQuotes && ch === escChar && i + 1 < cmd.length) {
      out += ch + cmd.charAt(i + 1); /* экранированный символ — не трогаем */
      i += 2;
      continue;
    }
    if (ch === '"') {
      inQuotes = !inQuotes;
      out += ch;
      i += 1;
      continue;
    }
    if (!inQuotes && (ch === ' ' || ch === TAB)) {
      const prev = out.length ? out.charAt(out.length - 1) : '';
      const next = i + 1 < cmd.length ? cmd.charAt(i + 1) : '';
      const dangling = next === '' || next === ' ' || next === TAB || next === NL;
      const leading = out === '' || prev === ' ' || prev === NL;
      if (dangling || leading) { i += 1; continue; }
      out += ' ';
      i += 1;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out.trim();
}
