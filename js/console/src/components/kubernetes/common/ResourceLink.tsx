import { ReactNode, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'

import { getResourceDetailsAbsPath } from '../../../routes/kubernetesRoutesConsts'
import { InlineLink } from '../../utils/typography/InlineLink'

import type { ObjectReference, UnknownProps } from './types'

interface ResourceLinkProps extends UnknownProps {
  objectRef: ObjectReference
  emptyState?: string
  // Displays only a name as a link message
  short?: boolean
  // Display kind/namespace/name as a link message
  full?: boolean
}

export default function ResourceLink({
  objectRef,
  emptyState = '-',
  short = false,
  full = false,
  ...props
}: ResourceLinkProps): ReactNode {
  const { clusterId } = useParams()
  const message = useMemo(() => {
    let partial = ''
    const { kind, namespace, name } = objectRef ?? {}

    if (short) {
      return name
    }

    if (full && kind) {
      partial += `${kind}/`
    }

    return namespace ? `${partial}${namespace}/${name}` : `${partial}${name}`
  }, [full, objectRef, short])

  if (full && short) {
    throw new Error(
      "full and short props are mutually exclusive and can't both be set to true"
    )
  }

  if (!objectRef?.name) return emptyState

  return (
    <Link
      to={getResourceDetailsAbsPath(
        clusterId,
        objectRef?.kind ?? '',
        objectRef?.name,
        objectRef?.namespace
      )}
      {...props}
    >
      <InlineLink as="span">{message}</InlineLink>
    </Link>
  )
}
