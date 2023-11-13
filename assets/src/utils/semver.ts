import semver from 'semver'

import { ProviderCloud } from '../components/cd/clusters/create/types'
import { AWS } from '../components/cd/clusters/create/provider/AWS'
import { GCP } from '../components/cd/clusters/create/provider/GCP'
import { Azure } from '../components/cd/clusters/create/provider/Azure'

import { isNonNullable } from './isNonNullable'

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

export function coerceSemver(version: string) {
  if (semver.valid(version)) {
    return version
  }

  const vsn = `${version}.0`

  return semver.valid(vsn) ? vsn : null
}
