import type { ReactNode } from 'react'

import styled from 'styled-components'

import { isExternalUrl } from 'markdoc/utils/text'
import { useMarkdocContext } from 'markdoc/MarkdocContext'

function Link({
  href,
  children,
  ...props
}: {
  href: string
  children?: ReactNode
  }) {
  const { useNormalizeHref } = useMarkdocContext()

  href = useNormalizeHref(href)
  const { renderLink: LinkComponent } = useMarkdocContext()

  return (
    <LinkComponent
      href={href}
      {...props}
      {...(isExternalUrl(href)
        ? { target: '_blank', rel: 'nofollow noopener' }
        : {})}
    >
      {children}
    </LinkComponent>
  )
}

export default styled(Link)(({ theme }) => ({
  '&, a:any-link&': {
    ...theme.partials.text.inlineLink,
  },
}))
