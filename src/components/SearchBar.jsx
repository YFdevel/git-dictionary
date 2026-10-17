const MODES = [
  { id: 'title', label: 'Цель' },
  { id: 'command', label: 'Команда' },
  { id: 'tags', label: 'Теги' },
  { id: 'description', label: 'Описание' },
];

export default function SearchBar({ query, onQueryChange, modes, onModesChange, onSearch, onReset }) {
  const handleKey = (e) => {
    if (e.key === 'Enter') onSearch();
    if (e.key === 'Escape') onQueryChange('');
  };
  const toggleMode = (id) => onModesChange({ ...modes, [id]: !modes[id] });

  return (
    <div className="searchbar">
      <div className="search-row">
        <div className="search-input-wrap">
          <span className="search-icon">🔍</span>
          <input
            id="search-input"
            type="text"
            value={query}
            placeholder="Например: изменить комментарий последнего коммита, stash, revert… (Ctrl+K)"
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={handleKey}
            autoFocus
          />
          {query && (
            <button className="icon-btn" title="Очистить" onClick={() => onQueryChange('')}>✕</button>
          )}
        </div>
        <button className="btn primary" onClick={onSearch} title="Enter — искать и сохранить запрос в историю">
          Найти ↵
        </button>
      </div>
      <div className="search-modes">
        <span>Искать по:</span>
        {MODES.map((m) => (
          <button
            key={m.id}
            className={'chip mode' + (modes[m.id] ? ' on' : '')}
            onClick={() => toggleMode(m.id)}
          >
            {m.label}
          </button>
        ))}
        <button className="link-btn" onClick={onReset}>Сбросить всё</button>
      </div>
    </div>
  );
}
