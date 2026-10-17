import { SHELLS } from '../lib/builder.js';

export default function Header({ shell, onShellChange, total, favoritesCount }) {
  return (
    <header className="app-header">
      <div className="brand">
        <span className="logo">⎇</span>
        <div>
          <h1>Git Dictionary</h1>
          <p>Справочник «цель → команда» · {total} команд · ★ {favoritesCount} в избранном</p>
        </div>
      </div>
      <div className="shell-picker" role="group" aria-label="Целевая оболочка">
        <span className="shell-label">Куда вставлять:</span>
        {SHELLS.map((s) => (
          <button
            key={s.id}
            className={'seg' + (shell === s.id ? ' active' : '')}
            title={s.hint}
            onClick={() => onShellChange(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>
    </header>
  );
}
