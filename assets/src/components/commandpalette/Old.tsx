function ItemInner({ action }) {
  return action.shortcut?.length ? (
    <div
      aria-hidden
      style={{ display: 'grid', gridAutoFlow: 'column', gap: '4px' }}
    >
      {action.shortcut.map((sc) => (
        <kbd
          key={sc}
          style={{
            padding: '4px 6px',
            background: 'rgba(0 0 0 / .1)',
            borderRadius: '4px',
            fontSize: 14,
          }}
        >
          {sc}
        </kbd>
      ))}
    </div>
  ) : null
}
