import type { ReactNode } from 'react'

import { Link as NextLink } from 'react-router-dom'

import styled from 'styled-components'

import { isExternalUrl } from 'markdoc/utils/text'
import { useHref } from 'markdoc/utils/react-router'

function Link({
  href,
  children,
  ...props
}: {
  href: string
  children?: ReactNode
}) {
  href = useHref(href)

  return (
    <NextLink
      to={href}
      {...props}
      {...(isExternalUrl(href)
        ? { target: '_blank', rel: 'nofollow noopener' }
        : {})}
    >
      {children}
    </NextLink>
  )
}

export default styled(Link)(({ theme }) => ({
  '&, a:any-link&': {
    ...theme.partials.text.inlineLink,
  },
}))
