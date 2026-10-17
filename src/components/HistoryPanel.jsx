import { useState } from 'react';
import { DANGER_LABELS } from '../data/commands.js';
import { copyPlainText } from '../lib/clipboard.js';

function timeAgo(ts) {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return 'только что';
  const min = Math.floor(sec / 60);
  if (min < 60) return min + ' мин назад';
  const h = Math.floor(min / 60);
  if (h < 24) return h + ' ч назад';
  return new Date(ts).toLocaleDateString('ru-RU');
}

export default function HistoryPanel({
  searchHistory, commandHistory, onApplySearch, onOpenCommand, onClearSearch, onClearCommands,
}) {
  const [tab, setTab] = useState('search');

  return (
    <aside className="history">
      <div className="tabs">
        <button className={'tab' + (tab === 'search' ? ' active' : '')} onClick={() => setTab('search')}>
          История поиска{searchHistory.length > 0 && <span className="count"> {searchHistory.length}</span>}
        </button>
        <button className={'tab' + (tab === 'commands' ? ' active' : '')} onClick={() => setTab('commands')}>
          Команды{commandHistory.length > 0 && <span className="count"> {commandHistory.length}</span>}
        </button>
      </div>

      {tab === 'search' && (
        <div className="history-list">
          {searchHistory.length === 0 && (
            <p className="empty">Пока пусто. Нажмите Enter в поиске — запрос сохранится здесь.</p>
          )}
          {searchHistory.map((h) => (
            <button key={h.id} className="history-item" onClick={() => onApplySearch(h)} title="Повторить запрос">
              <span className="hi-query">{h.query ? '«' + h.query + '»' : <i>(без текста)</i>}</span>
              <span className="hi-meta">
                {h.categoryLabel}
                {h.dangerFilter !== 'all' && ' · ' + (DANGER_LABELS[h.dangerFilter] ?? '')}
                {h.favoritesOnly && ' · ★'}
                {' · ' + timeAgo(h.ts)}
              </span>
            </button>
          ))}
          {searchHistory.length > 0 && (
            <button className="link-btn" onClick={onClearSearch}>Очистить историю поиска</button>
          )}
        </div>
      )}

      {tab === 'commands' && (
        <div className="history-list">
          {commandHistory.length === 0 && (
            <p className="empty">Пока пусто. Скопированные команды появятся здесь.</p>
          )}
          {commandHistory.map((h) => (
            <div key={h.id} className="history-item cmd">
              <button className="hi-open" onClick={() => onOpenCommand(h)} title="Открыть с этими параметрами">
                <span className="hi-title">{h.title}</span>
                <code className="hi-code">{h.command}</code>
                <span className="hi-meta">{timeAgo(h.ts)}</span>
              </button>
              <button className="icon-btn" title="Скопировать снова" onClick={() => copyPlainText(h.command)}>
                📋
              </button>
            </div>
          ))}
          {commandHistory.length > 0 && (
            <button className="link-btn" onClick={onClearCommands}>Очистить историю команд</button>
          )}
        </div>
      )}
    </aside>
  );
}
