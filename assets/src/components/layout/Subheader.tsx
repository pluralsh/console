import {
  ArrowLeftIcon,
  ArrowRightIcon,
  Breadcrumbs,
  IconFrame,
} from '@pluralsh/design-system'
import CommandPaletteLauncher from 'components/commandpalette/CommandPaletteLauncher.tsx'
import { useNavigate } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'
import ExplainWithAI from '../ai/explain/ExplainWithAI.tsx'

const SubheaderSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  backgroundColor: theme.colors['fill-accent'],
  borderBottom: theme.borders.default,
  minHeight: 48,
  paddingLeft: theme.spacing.large,
  paddingRight: theme.spacing.large,
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
  const navigate = useNavigate()

  return (
    <SubheaderSC>
      <div css={{ display: 'flex', gap: theme.spacing.small }}>
        <IconFrame
          clickable
          size="small"
          icon={<ArrowLeftIcon />}
          onClick={() => navigate(-1)}
          textValue="Back"
          type="floating"
        />
        <IconFrame
          clickable
          size="small"
          icon={<ArrowRightIcon />}
          onClick={() => navigate(1)}
          textValue="Forward"
          type="floating"
        />
      </div>
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
