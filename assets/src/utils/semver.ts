import semver, { coerce } from 'semver'

import { ProviderCloud } from '../components/cd/clusters/create/types'

import { Maybe } from '../generated/graphql'

import { isNonNullable } from './isNonNullable'

export function canUpgrade(version: string) {
  return !version || semver.lt(version, '1.28.0')
}

export function isUpgrading(
  version?: Maybe<string>,
  currentVersion?: Maybe<string>
): boolean {
  if (!version || !currentVersion) return false

  const coercedVersion = semver.coerce(version)
  const coercedCurrentVersion = semver.coerce(currentVersion)

  if (!coercedVersion || !coercedCurrentVersion) return false

  const dots = (version.match(/\./g) || []).length

  if (coercedVersion.major !== coercedCurrentVersion?.major) {
    return true
  }

  if (dots > 0 && coercedVersion?.minor !== coercedCurrentVersion?.minor) {
    return true
  }

  return dots > 1 && coercedVersion?.patch !== coercedCurrentVersion?.patch
}

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
  supported: Nullable<Nullable<string>[]>
): string[] {
  const coercedCurrent = semver.coerce(current)
  let upgrades = supported?.filter(isNonNullable) ?? []

  if (coercedCurrent) {
    upgrades =
      upgrades?.filter(
        (ver) =>
          semver.gt(ver, coercedCurrent) &&
          semver.minor(ver) - semver.minor(coercedCurrent) <= 1
      ) ?? []
  }

  return upgrades.sort(semver.rcompare)
}

export function toNiceVersion(version: Nullable<string>) {
  if (!version || version.startsWith('v')) {
    return `${version}`
  }

  return `${version.startsWith('v') ? '' : 'v'}${version}`
}

export function trimVersion(version: Nullable<string>): string {
  if (!version) {
    return ''
  }

  return version.endsWith('.0')
    ? version.substring(0, version.length - 2)
    : version
}

export function toProviderSupportedVersion(
  version: Nullable<string>,
  providerCloud: Nullable<string>
) {
  const coercedVersion = semver.coerce(version)

  if (!coercedVersion || !providerCloud) {
    return null
  }

  // We need to skip patch version for AWS as its versioning doesn't follow SemVer spec.
  if (providerCloud === ProviderCloud.AWS) {
    return `${coercedVersion.major}.${coercedVersion.minor}`
  }

  return version
}
