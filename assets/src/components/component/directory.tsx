export const directory: {
  label: string
  path: string
  prometheus?: boolean
  onlyFor?: string[]
}[] = [
  {
    label: 'Info',
    path: 'info',
  },
  {
    label: 'Metrics',
    path: 'metrics',
    onlyFor: ['deployment', 'statefulset'],
    prometheus: true,
  },
  {
    label: 'Events',
    path: 'events',
  },
  {
    label: 'Raw',
    path: 'raw',
  },
  {
    label: 'Certificates',
    path: 'certificates',
    onlyFor: ['ingress'],
  },
]
