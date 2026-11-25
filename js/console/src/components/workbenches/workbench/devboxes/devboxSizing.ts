// the box's per-instance resources, e.g. "2 CPU · 4Gi · 20Gi disk"
export function devboxSizing(resources: unknown): Nullable<string> {
  if (!resources || typeof resources !== 'object') return null
  const { cpu, memory, disk } = resources as Record<string, unknown>
  const parts = [
    cpu != null && `${cpu} CPU`,
    memory != null && `${memory}`,
    disk != null && `${disk} disk`,
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : null
}
