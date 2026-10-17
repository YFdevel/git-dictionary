import { useCallback, useEffect, useMemo, useState } from 'react';
import Header from './components/Header.jsx';
import SearchBar from './components/SearchBar.jsx';
import Sidebar from './components/Sidebar.jsx';
import CommandCard from './components/CommandCard.jsx';
import HistoryPanel from './components/HistoryPanel.jsx';
import { COMMANDS, CATEGORIES, DANGER_LABELS } from './data/commands.js';
import { defaultValues } from './lib/builder.js';
import { load, save } from './lib/storage.js';

const SEARCH_HISTORY_LIMIT = 25;
const COMMAND_HISTORY_LIMIT = 30;

function uid() {
  return Date.now() + '-' + Math.random().toString(36).slice(2, 7);
}

/* поиск сразу по нескольким критериям */
function matchesQuery(cmd, query, modes) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const fields = [];
  if (modes.title) fields.push(cmd.title);
  if (modes.command) fields.push(cmd.command);
  if (modes.tags) fields.push(cmd.tags.join(' '));
  if (modes.description) fields.push(cmd.description);
  return fields.some((f) => f && f.toLowerCase().includes(q));
}

export default function App() {
  const [query, setQuery] = useState('');
  const [modes, setModes] = useState({ title: true, command: true, tags: true, description: true });
  const [category, setCategory] = useState('all');
  const [dangerFilter, setDangerFilter] = useState('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const [shell, setShell] = useState(() => load('shell', 'bash'));
  const [favorites, setFavorites] = useState(() => new Set(load('favorites', [])));
  const [searchHistory, setSearchHistory] = useState(() => load('searchHistory', []));
  const [commandHistory, setCommandHistory] = useState(() => load('commandHistory', []));

  const [expandedId, setExpandedId] = useState(null);
  const [builderValues, setBuilderValues] = useState({});

  const categoryById = useMemo(() => new Map(CATEGORIES.map((c) => [c.id, c])), []);
  const byId = useCallback((id) => COMMANDS.find((c) => c.id === id), []);
  const counts = useMemo(() => {
    const map = {};
    for (const c of COMMANDS) map[c.category] = (map[c.category] ?? 0) + 1;
    return map;
  }, []);

  const results = useMemo(() => COMMANDS.filter((cmd) =>
    matchesQuery(cmd, query, modes)
    && (category === 'all' || cmd.category === category)
    && (dangerFilter === 'all' || cmd.danger === dangerFilter)
    && (!favoritesOnly || favorites.has(cmd.id))
  ), [query, modes, category, dangerFilter, favoritesOnly, favorites]);

  /* сохранение состояния (localStorage, UTF-8) */
  useEffect(() => save('shell', shell), [shell]);
  useEffect(() => save('favorites', [...favorites]), [favorites]);
  useEffect(() => save('searchHistory', searchHistory), [searchHistory]);
  useEffect(() => save('commandHistory', commandHistory), [commandHistory]);

  /* Ctrl+K / Cmd+K — фокус на поиск */
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        document.getElementById('search-input')?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* история поисковых запросов: Enter / кнопка «Найти» / клик по тегу */
  const runSearch = useCallback((text) => {
    const q = String(text ?? query).trim();
    const hasFilters = category !== 'all' || dangerFilter !== 'all' || favoritesOnly;
    if (!q && !hasFilters) return;
    const sig = JSON.stringify([q, modes, category, dangerFilter, favoritesOnly]);
    setSearchHistory((prev) => {
      const rec = {
        id: uid(),
        ts: Date.now(),
        sig,
        query: q,
        modes: { ...modes },
        category,
        categoryLabel: category === 'all'
          ? 'все категории'
          : (categoryById.get(category)?.label ?? category),
        dangerFilter,
        favoritesOnly,
      };
      return [rec, ...prev.filter((h) => h.sig !== sig)].slice(0, SEARCH_HISTORY_LIMIT);
    });
  }, [query, modes, category, dangerFilter, favoritesOnly, categoryById]);

  const applySearchRecord = useCallback((rec) => {
    setQuery(rec.query);
    setModes({ ...rec.modes });
    setCategory(rec.category);
    setDangerFilter(rec.dangerFilter);
    setFavoritesOnly(rec.favoritesOnly);
  }, []);

  const resetAll = useCallback(() => {
    setQuery('');
    setCategory('all');
    setDangerFilter('all');
    setFavoritesOnly(false);
  }, []);

  const handleTagClick = useCallback((tag) => {
    setQuery(tag);
    runSearch(tag);
  }, [runSearch]);

  const toggleFavorite = useCallback((id) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleExpand = useCallback((id) => {
    setExpandedId((prev) => (prev === id ? null : id));
    setBuilderValues((prev) => {
      if (prev[id]) return prev;
      const cmd = byId(id);
      return cmd ? { ...prev, [id]: defaultValues(cmd.params) } : prev;
    });
  }, [byId]);

  const handleValuesChange = useCallback((id, values) => {
    setBuilderValues((prev) => ({ ...prev, [id]: values }));
  }, []);

  /* скопированная команда попадает в историю */
  const handleCopied = useCallback((command, values, finalCommand) => {
    setCommandHistory((prev) => [
      {
        id: uid(),
        ts: Date.now(),
        commandId: command.id,
        title: command.title,
        command: finalCommand,
        values: { ...values },
      },
      ...prev.filter((h) => !(h.commandId === command.id && h.command === finalCommand)),
    ].slice(0, COMMAND_HISTORY_LIMIT));
  }, []);

  /* открыть карточку из истории с теми же значениями полей */
  const openFromCommandHistory = useCallback((rec) => {
    const cmd = byId(rec.commandId);
    if (!cmd) return;
    setQuery('');
    setCategory('all');
    setDangerFilter('all');
    setFavoritesOnly(false);
    setBuilderValues((prev) => ({ ...prev, [cmd.id]: { ...defaultValues(cmd.params), ...rec.values } }));
    setExpandedId(cmd.id);
    setTimeout(() => {
      document.getElementById('cmd-' + cmd.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
  }, [byId]);

  return (
    <div className="app">
      <Header shell={shell} onShellChange={setShell} total={COMMANDS.length} favoritesCount={favorites.size} />

      <div className="layout">
        <Sidebar
          categories={CATEGORIES}
          counts={counts}
          activeCategory={category}
          onCategory={setCategory}
          dangerFilter={dangerFilter}
          onDanger={setDangerFilter}
          favoritesOnly={favoritesOnly}
          onFavoritesOnly={setFavoritesOnly}
        />

        <main className="results">
          <SearchBar
            query={query}
            onQueryChange={setQuery}
            modes={modes}
            onModesChange={setModes}
            onSearch={() => runSearch()}
            onReset={resetAll}
          />

          <div className="results-meta">
            <span>Найдено: <b>{results.length}</b> из {COMMANDS.length}</span>
            {query.trim() && <span className="muted">«{query.trim()}»</span>}
            {category !== 'all' && <span className="chip on">{categoryById.get(category)?.label ?? category}</span>}
            {dangerFilter !== 'all' && <span className="chip on">{DANGER_LABELS[dangerFilter]}</span>}
            {favoritesOnly && <span className="chip on">★ только избранное</span>}
          </div>

          {results.length === 0 ? (
            <div className="empty-state">
              <p><b>Ничего не найдено</b></p>
              <p>Попробуйте другое слово, включите другие критерии поиска или сбросьте фильтры.</p>
              <button className="btn" onClick={resetAll}>Сбросить всё</button>
            </div>
          ) : (
            results.map((cmd) => (
              <CommandCard
                key={cmd.id}
                command={cmd}
                category={categoryById.get(cmd.category) ?? { label: cmd.category, color: '#8aa0c2' }}
                expanded={expandedId === cmd.id}
                favorite={favorites.has(cmd.id)}
                onToggleFavorite={toggleFavorite}
                onToggleExpand={() => toggleExpand(cmd.id)}
                shell={shell}
                values={builderValues[cmd.id] ?? {}}
                onValuesChange={handleValuesChange}
                onCopy={handleCopied}
                onTagClick={handleTagClick}
              />
            ))
          )}

          <footer className="app-footer">
            Ctrl+K — фокус на поиске · Enter — искать и сохранить запрос в историю ·
            копирование — чистый текст UTF-8 без форматирования
          </footer>
        </main>

        <HistoryPanel
          searchHistory={searchHistory}
          commandHistory={commandHistory}
          onApplySearch={applySearchRecord}
          onOpenCommand={openFromCommandHistory}
          onClearSearch={() => setSearchHistory([])}
          onClearCommands={() => setCommandHistory([])}
        />
      </div>
    </div>
  );
}
