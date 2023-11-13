export const directory: { label: string; path: string; onlyFor?: string[] }[] =
  [
    { label: 'Info', path: 'info' },
    {
      label: 'Metrics',
      path: 'metrics',
      onlyFor: ['deployment', 'statefulset'],
    },
    { label: 'Events', path: 'events' },
    { label: 'Raw', path: 'raw' },
  ]
