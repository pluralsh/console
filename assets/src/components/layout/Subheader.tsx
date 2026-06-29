import { Breadcrumbs, Chip, Flex, ReturnIcon } from '@pluralsh/design-system'
import { CommandPaletteLauncher } from 'components/commandpalette/CommandPaletteLauncher.tsx'
import { Link } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'
import ExplainWithAI from '../ai/explain/ExplainWithAI.tsx'
import { useSubheaderBackButton } from './useSubheaderBackButton.tsx'

const SubheaderSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  backgroundColor: theme.colors['fill-accent'],
  borderBottom: theme.borders.default,
  minHeight: 48,
  paddingLeft: theme.spacing.medium,
  paddingRight: theme.spacing.medium,
  gap: theme.spacing.medium,
}))

const BreadcrumbsContainerSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'left',
  justifyContent: 'left',
  overflow: 'hidden',
  flexGrow: 1,
  '.crumbs': {
    paddingTop: theme.spacing.small,
    paddingBottom: theme.spacing.small,
  },
}))

export default function Subheader() {
  const theme = useTheme()
  const backButton = useSubheaderBackButton()

  return (
    <SubheaderSC>
      {backButton && (
        <BackLinkSC to={backButton.to}>
          <Chip
            clickable
            size="small"
            fillLevel={2}
            icon={<ReturnIcon size={12} />}
          >
            <Flex
              align="center"
              gap="xsmall"
            >
              {backButton.icon}
              {backButton.label}
            </Flex>
          </Chip>
        </BackLinkSC>
      )}
      <BreadcrumbsContainerSC>
        <Breadcrumbs className="crumbs" />
      </BreadcrumbsContainerSC>
      <div
        css={{
          display: 'flex',
          gap: theme.spacing.small,
          marginRight: theme.spacing.xxsmall,
        }}
      >
        <ExplainWithAI />
        <CommandPaletteLauncher />
      </div>
    </SubheaderSC>
  )
}

const BackLinkSC = styled(Link)({
  display: 'inline-flex',
  flexShrink: 0,
  textDecoration: 'none',
})
