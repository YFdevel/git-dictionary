import { previewTemplate } from '../lib/builder.js';
import CommandBuilder from './CommandBuilder.jsx';

const DANGER_META = {
  safe: { label: 'безопасно', cls: 'safe' },
  warn: { label: '⚠ осторожно', cls: 'warn' },
  danger: { label: '⚠⚠ необратимо', cls: 'danger' },
};

function Preview({ command }) {
  const text = previewTemplate(command.command, command.params);
  const parts = text.split(/(<[^<>]*>)/g);
  return (
    <code className="cmd-preview">
      {parts.map((p, i) =>
        p.startsWith('<') ? <span key={i} className="ph">{p}</span> : <span key={i}>{p}</span>
      )}
    </code>
  );
}

export default function CommandCard({
  command, category, expanded, favorite,
  onToggleFavorite, onToggleExpand, shell, values, onValuesChange, onCopy, onTagClick,
}) {
  const dm = DANGER_META[command.danger] ?? DANGER_META.safe;
  return (
    <article className={'card' + (expanded ? ' expanded' : '')} id={'cmd-' + command.id}>
      <div
        className="card-head"
        onClick={onToggleExpand}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleExpand(); }
        }}
      >
        <button
          className={'star' + (favorite ? ' on' : '')}
          title={favorite ? 'Убрать из избранного' : 'Добавить в избранное'}
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(command.id); }}
        >
          {favorite ? '★' : '☆'}
        </button>
        <div className="card-main">
          <h3 className="card-title">{command.title}</h3>
          <Preview command={command} />
        </div>
        <div className="card-badges">
          <span className="badge cat-badge" style={{ '--c': category.color }}>{category.label}</span>
          <span className={'badge danger-badge ' + dm.cls}>{dm.label}</span>
        </div>
        <span className="chevron">{expanded ? '▾' : '▸'}</span>
      </div>

      {expanded && (
        <div className="card-body">
          <p className="card-desc">{command.description}</p>
          <div className="tags">
            {command.tags.map((t) => (
              <button key={t} className="tag" onClick={() => onTagClick(t)}>#{t}</button>
            ))}
          </div>
          <CommandBuilder
            command={command}
            shell={shell}
            values={values}
            onChange={onValuesChange}
            onCopy={onCopy}
          />
        </div>
      )}
    </article>
  );
}
