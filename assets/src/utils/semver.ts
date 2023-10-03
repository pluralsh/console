import semver from 'semver'

export function incPatchVersion(
  version: string | null | undefined
): string | null {
  const parsed = semver.valid(semver.coerce(version))

  return parsed ? semver.inc(parsed, 'patch') : null
}
