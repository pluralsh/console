import semver, { coerce } from 'semver'

import { ProviderCloud } from '../components/cd/clusters/create/types'

import { isNonNullable } from './isNonNullable'

export function nextSupportedVersion(
  current?: Nullable<string>,
  supported?: Nullable<Nullable<string>[]>
): string | null {
  return semver.minSatisfying(
    supported?.map((vsn) => coerce(vsn)?.raw).filter(isNonNullable) ?? [],
    `>${current}`
  )
}

export function supportedUpgrades(
  current: Nullable<string>,
  supportedVersions: Nullable<Nullable<string>[]>
): string[] {
  let versions: string[]
  const coercedCurrent = semver.coerce(current)

  if (!coercedCurrent) {
    versions = supportedVersions?.filter(isNonNullable) ?? []
  } else {
    versions =
      supportedVersions?.filter(
        (ver): ver is string =>
          !!ver &&
          semver.gt(ver, coercedCurrent) &&
          semver.minor(ver) - semver.minor(coercedCurrent) <= 1
      ) ?? []
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
