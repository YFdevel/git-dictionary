import { useEffect, useMemo, useRef, useState } from 'react';
import { renderTemplate, missingRequired, exampleValues, SHELLS } from '../lib/builder.js';
import { copyPlainText } from '../lib/clipboard.js';

const NL = String.fromCharCode(10);

export default function CommandBuilder({ command, shell, values, onChange, onCopy }) {
  const [feedback, setFeedback] = useState('');
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const finalCommand = useMemo(
    () => renderTemplate(command.command, command.params, values, shell),
    [command, values, shell]
  );
  const missing = useMemo(() => missingRequired(command.params, values), [command, values]);
  const shellMeta = SHELLS.find((s) => s.id === shell);
  const hasMultiline = command.params.some(
    (p) => p.multiline && String(values[p.name] ?? '').includes(NL)
  );
  const ready = missing.length === 0 && finalCommand.trim() !== '';

  const flash = (msg) => {
    setFeedback(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setFeedback(''), 2200);
  };

  const setValue = (name, value) => onChange(command.id, { ...values, [name]: value });

  const doCopy = async (withComment) => {
    const commentMark = shell === 'cmd' ? 'REM' : '#';
    const text = withComment
      ? commentMark + ' ' + command.title + NL + finalCommand
      : finalCommand;
    const ok = await copyPlainText(text);
    if (ok) {
      flash(withComment ? '✓ Скопировано с комментарием' : '✓ Скопировано (чистый текст, UTF-8)');
      onCopy?.(command, values, finalCommand);
    } else {
      flash('✗ Не удалось скопировать — выделите команду вручную');
    }
  };

  return (
    <div className="builder">
      {command.params.length > 0 && (
        <div className="params">
          <div className="params-head">
            <span>Параметры для подстановки</span>
            <button className="link-btn" onClick={() => onChange(command.id, exampleValues(command.params))}>
              Заполнить примером
            </button>
          </div>
          <div className="params-grid">
            {command.params.map((p) => (
              <label key={p.name} className={'param' + (p.multiline ? ' wide' : '')}>
                <span className="param-label">
                  {p.label}
                  {p.required && p.type !== 'select' && p.type !== 'flag' && <em className="req"> *</em>}
                  {p.type === 'flag' && <code className="param-flag-value">{p.value}</code>}
                </span>

                {p.type === 'flag' ? (
                  <span className="param-control">
                    <input
                      type="checkbox"
                      checked={Boolean(values[p.name])}
                      onChange={(e) => setValue(p.name, e.target.checked)}
                    />
                  </span>
                ) : p.type === 'select' ? (
                  <select value={values[p.name] ?? ''} onChange={(e) => setValue(p.name, e.target.value)}>
                    {p.options.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                ) : p.multiline ? (
                  <textarea
                    rows={2}
                    value={values[p.name] ?? ''}
                    placeholder={p.example}
                    onChange={(e) => setValue(p.name, e.target.value)}
                  />
                ) : (
                  <input
                    type={p.type === 'number' ? 'number' : 'text'}
                    value={values[p.name] ?? ''}
                    placeholder={p.example}
                    onChange={(e) => setValue(p.name, e.target.value)}
                  />
                )}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="result-box">
        <div className="result-head">
          <span className="result-title">Готово к вставке в {shellMeta?.label ?? shell}</span>
          {missing.length > 0 && <span className="missing">Не заполнено: {missing.join(', ')}</span>}
        </div>
        <pre className="result-code">
          <span className="prompt" aria-hidden="true">❯ </span>
          {finalCommand}
        </pre>
        {hasMultiline && shell !== 'bash' && (
          <p className="note warn-note">
            ℹ Для {shellMeta?.label} переносы строк в сообщении заменены пробелами.
          </p>
        )}
        <div className="result-actions">
          <button className="btn primary" disabled={!ready} onClick={() => doCopy(false)}>
            📋 Скопировать команду
          </button>
          <button className="btn" disabled={!ready} onClick={() => doCopy(true)}>
            📝 С комментарием
          </button>
          {feedback && <span className={'feedback' + (feedback.startsWith('✗') ? ' err' : '')}>{feedback}</span>}
        </div>
        <p className="note">
          В буфер обмена попадает только чистый текст (UTF-8, без форматирования) — вставка в терминал
          не «прихватит» стили. Кавычки и спецсимволы уже экранированы под выбранную оболочку.
        </p>
      </div>
    </div>
  );
}
