import { ReactNode, useMemo } from 'react'

import { Common_PodInfo as PodInfoT } from '../../../generated/graphql-kubernetes'

interface PodInfoProps {
  info: PodInfoT
}

export function PodInfo({ info }: PodInfoProps): ReactNode {
  return useMemo(() => {
    const running = info?.running ?? 0
    const current = info?.current ?? 0
    const succeeded = info?.succeeded ?? 0
    const pending = info?.pending ?? 0
    const failed = info?.failed ?? 0
    const desired = info?.desired ?? 0

    let result = ''

    if (running > 0) {
      result += `${running} Running /`
    }

    if (succeeded > 0) {
      result += `${succeeded} Succeeded / `
    }

    if (pending > 0) {
      result += `${pending} Pending / `
    }

    if (failed > 0) {
      result += `${failed} Failed / `
    }

    result += ` ${current} Current / `
    result += ` ${desired} Desired`

    return result
  }, [info])
}
