import type { ComponentPropsWithoutRef } from 'react'

import { GitHubLogoIcon } from '@pluralsh/design-system'

import styled from 'styled-components'

function PageFooter({ className }: { className?: string }) {
  return (
    <footer
      className={className}
      // https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/contentinfo_role
      role="contentinfo"
    >
      <FooterLink as="div">© Plural {new Date().getFullYear()}</FooterLink>
      <FooterLink href="https://plural.sh/legal/privacy-policy">
        Privacy Policy
      </FooterLink>
      <FooterLink href="https://www.plural.sh/legal/terms-and-conditions">
        Terms & Conditions
      </FooterLink>
      <FooterLink
        href="#"
        onClick={(e) => {
          e.preventDefault()
          window.Cookiebot?.show()
        }}
      >
        Cookie Settings
      </FooterLink>
    </footer>
  )
}

export const FooterLink = styled.a(({ theme }) => ({
  '&, &:any-link': {
    ...theme.partials.text.body2,
    color: theme.colors['text-xlight'],
    textDecoration: 'none',
  },
  '&:any-link:hover': {
    color: theme.colors['text-light'],
    textDecoration: 'underline',
  },
}))

export const EditOnGitHubLink = styled(
  ({ ...props }: ComponentPropsWithoutRef<'a'>) => (
    <a
      href=""
      {...props}
    >
      <GitHubLogoIcon size={20} />
      Edit on Github
    </a>
  )
)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.small,
  marginTop: theme.spacing.xxlarge,
}))

export default styled(PageFooter)(({ theme }) => ({
  position: 'sticky',
  top: '100vh',
  display: 'flex',
  gap: theme.spacing.medium,
  flexWrap: 'wrap',
  marginBottom: theme.spacing.large,
}))
