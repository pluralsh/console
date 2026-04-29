import { Flex, WorkbenchIcon, IconFrame } from '@pluralsh/design-system'
import { CaptionP } from 'components/utils/typography/Text'
import { useNavigate } from 'react-router-dom'
import { getWorkbenchAbsPath } from 'routes/workbenchesRoutesConsts'
import styled, { useTheme } from 'styled-components'

export type FlowWorkbenchRow = {
  id: string
  name: string
}

export function FlowSidePanel({
  workbenches,
}: {
  workbenches: FlowWorkbenchRow[]
}) {
  const theme = useTheme()
  const navigate = useNavigate()

  return (
    <WrapperSC>
      <ContentSC>
        <SectionSC $first>
          <CaptionP $color="text-xlight">Workbenches</CaptionP>
          {workbenches.length ? (
            <Flex
              gap="small"
              direction="column"
            >
              {workbenches.map((workbench) => (
                <WorkbenchRowButtonSC
                  key={workbench.id}
                  type="button"
                  onClick={() => navigate(getWorkbenchAbsPath(workbench.id))}
                >
                  <ItemIconContainerSC>
                    <IconFrame
                      icon={<WorkbenchIcon />}
                      size="xsmall"
                    />
                  </ItemIconContainerSC>
                  <WorkbenchNameSC>{workbench.name}</WorkbenchNameSC>
                </WorkbenchRowButtonSC>
              ))}
            </Flex>
          ) : (
            <>
              <DividerSC css={{ margin: `${theme.spacing.small}px 0` }} />
              <Flex
                direction="column"
                gap="xxsmall"
              >
                <CaptionP $color="text-xlight">
                  Connect a workbench to your workflow. Workbenches serve as
                  always-on, customizable DevOps agents that monitor alerts,
                  resolve environment issues, and manage ticket closures.
                </CaptionP>
                <LearnMoreLinkSC
                  href="https://www.plural.sh/blog/introducing-plural-workbenches-build-your-own-agents-for-devops/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Learn more use cases
                </LearnMoreLinkSC>
              </Flex>
            </>
          )}
        </SectionSC>
      </ContentSC>
    </WrapperSC>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  backgroundColor: theme.colors['fill-one'],
  borderRight: theme.borders['fill-one'],
  display: 'flex',
  flexDirection: 'column',
  flexGrow: 1,
  minHeight: 0,
  minWidth: 250,
  maxWidth: 250,
  overflowX: 'hidden',
  overflowY: 'auto',
}))

const ContentSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.large,
  minHeight: '100%',
  padding: theme.spacing.medium,
}))

const SectionSC = styled.div<{ $first?: boolean }>(({ theme, $first }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  ...(!$first && {
    borderTop: theme.borders['fill-one'],
    paddingTop: theme.spacing.medium,
  }),
}))

const WorkbenchRowButtonSC = styled.button(({ theme }) => ({
  ...theme.partials.reset.button,
  alignItems: 'center',
  display: 'flex',
  gap: theme.spacing.xsmall,
  width: '100%',
  textAlign: 'left',
  '&:hover span': {
    color: theme.colors.text,
  },
}))

const ItemIconContainerSC = styled.div({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 20,
  height: 20,
})

const WorkbenchNameSC = styled.span(({ theme }) => ({
  color: theme.colors['text-light'],
  flex: 1,
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}))

const DividerSC = styled.div(({ theme }) => ({
  borderTop: theme.borders['fill-one'],
}))

const LearnMoreLinkSC = styled.a(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-input-disabled'],
  textDecoration: 'none',
  width: 'fit-content',
  '&:hover': {
    color: theme.colors['text-light'],
  },
}))
