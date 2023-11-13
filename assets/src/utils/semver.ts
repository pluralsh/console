import semver from 'semver'

import { ProviderCloud } from '../components/cd/clusters/create/types'

import { isNonNullable } from './isNonNullable'

export function nextSupportedVersion(
  version?: Nullable<string>,
  supportedVersions?: Nullable<Nullable<string>[]>
): string | null {
  const supported = supportedVersions?.filter((v): v is string => !!v) ?? []

  return semver.minSatisfying(supported, `>${version}`)
}

export function supportedUpgrades(
  currentVersion: Nullable<string>,
  supportedVersions: Nullable<Nullable<string>[]>
): string[] {
  let versions: string[]
  const current = semver.coerce(currentVersion)

  if (!current) {
    versions = supportedVersions?.filter(isNonNullable) || []
  } else {
    versions =
      supportedVersions?.filter(
        (ver): ver is string =>
          !!ver &&
          semver.gt(ver, current) &&
          semver.minor(ver) - semver.minor(current) <= 1
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

export function toProviderSupportedVersion(
  version: Nullable<string>,
  providerCloud: Nullable<string>
) {
  const parsedVersion = semver.coerce(version)

  if (!parsedVersion || !providerCloud) {
    return null
  }

  // We need to skip patch version for AWS as its versioning doesn't follow SemVer spec.
  if (providerCloud === ProviderCloud.AWS) {
    return `${parsedVersion.major}.${parsedVersion.minor}`
  }

  return version
}
