import type { ReactNode } from 'react'

import styled from 'styled-components'

import { isExternalUrl } from 'markdoc/utils/text'
import { useNavigationContext } from '@pluralsh/design-system'
import { useNormalizeHref } from 'markdoc/utils/useNormalizeHref'

function Link({
  href,
  children,
  ...props
}: {
  href: string
  children?: ReactNode
  }) {
  href = useNormalizeHref(href)
  const { Link: LinkComponent } = useNavigationContext()

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
