export const directory: {
  label: string
  path: string
  prometheus?: boolean
  onlyFor?: string[]
  onlyIfDryRun?: boolean
  onlyIfNoError?: boolean
}[] = [
  {
    label: 'Info',
    path: 'info',
    onlyIfNoError: true,
  },
  {
    label: 'Raw',
    path: 'raw',
    onlyIfNoError: true,
  },
  {
    label: 'Metrics',
    path: 'metrics',
    onlyFor: ['deployment', 'statefulset'],
    onlyIfNoError: true,
    prometheus: true,
  },
  {
    label: 'Events',
    path: 'events',
    onlyIfNoError: true,
  },
  {
    label: 'Tree view',
    path: 'tree',
    onlyIfNoError: true,
  },
  {
    label: 'Dry run',
    path: 'dryrun',
    onlyIfDryRun: true,
  },
  {
    label: 'Metadata',
    path: 'metadata',
  },
]
