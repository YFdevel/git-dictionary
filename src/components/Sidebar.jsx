const DANGERS = [
  { id: 'all', label: 'Любой' },
  { id: 'safe', label: 'Безопасные' },
  { id: 'warn', label: 'Осторожно' },
  { id: 'danger', label: 'Необратимые' },
];

export default function Sidebar({
  categories, counts, activeCategory, onCategory,
  dangerFilter, onDanger, favoritesOnly, onFavoritesOnly,
}) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return (
    <aside className="sidebar">
      <div className="side-block">
        <h4>Категории</h4>
        <button className={'cat' + (activeCategory === 'all' ? ' active' : '')} onClick={() => onCategory('all')}>
          <span className="cat-dot" />
          Все команды
          <span className="count">{total}</span>
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            className={'cat' + (activeCategory === c.id ? ' active' : '')}
            onClick={() => onCategory(c.id)}
          >
            <span className="cat-dot" style={{ background: c.color }} />
            {c.label}
            <span className="count">{counts[c.id] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="side-block">
        <h4>Уровень риска</h4>
        {DANGERS.map((d) => (
          <label key={d.id} className="radio">
            <input type="radio" name="danger" checked={dangerFilter === d.id} onChange={() => onDanger(d.id)} />
            {d.label}
          </label>
        ))}
      </div>

      <div className="side-block">
        <label className="check">
          <input type="checkbox" checked={favoritesOnly} onChange={(e) => onFavoritesOnly(e.target.checked)} />
          ★ Только избранное
        </label>
      </div>
    </aside>
  );
}
