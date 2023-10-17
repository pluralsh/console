import semver from 'semver'

export function nextSupportedVersion(
  version?: string | null,
  supportedVersions?: (string | null)[] | null
): string | null {
  const supported = supportedVersions
    ? supportedVersions.filter((v): v is string => !!v)
    : []

  return semver.minSatisfying(supported, `>${version}`)
}
