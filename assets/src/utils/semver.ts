import semver from 'semver'

import { isNonNullable } from './isNonNullable'

export function bumpMinor(version?: string | null): string | null {
  if (!version) return null

  return semver.inc(version, 'minor')
}

export function nextSupportedVersion(
  version?: string | null,
  supportedVersions?: (string | null)[] | null
): string | null {
  const supported = supportedVersions
    ? supportedVersions.filter((v): v is string => !!v)
    : []

  return semver.minSatisfying(supported, `>${version}`)
}

export function supportedUpgrades(
  currentVersion: Nullable<string>,
  supportedVersions: Nullable<Nullable<string>[]>
): string[] {
  let versions: string[]

  if (!currentVersion) {
    versions = supportedVersions?.filter(isNonNullable) || []
  } else {
    versions =
      supportedVersions?.filter(
        (ver): ver is string =>
          !!ver &&
          semver.gt(ver, currentVersion) &&
          semver.minor(ver) - semver.minor(currentVersion) <= 1
      ) || []
  }

  return versions.sort(semver.rcompare)
}

export function toNiceVersion(version: Nullable<string>) {
  if (!version || version.startsWith('v')) {
    return `${version}`
  }

  return `${version.startsWith('v') ? '' : 'v'}${version}`
}

export function coerceSemver(version: string) {
  if (semver.valid(version)) {
    return version
  }

  const vsn = `${version}.0`

  return semver.valid(vsn) ? vsn : null
}
