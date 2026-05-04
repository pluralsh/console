import {
  AddIcon,
  Button,
  Divider,
  Flex,
  IconFrame,
  WorkbenchIcon,
} from '@pluralsh/design-system'
import { WorkbenchToolIcon } from 'components/workbenches/tools/workbenchToolsUtils'
import { MetadataIcons } from 'components/utils/MetadataIcons'
import { TRUNCATE } from 'components/utils/truncate'
import { CaptionP } from 'components/utils/typography/Text'
import { WorkbenchTinyFragment } from 'generated/graphql'
import isEmpty from 'lodash/isEmpty'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getWorkbenchAbsPath } from 'routes/workbenchesRoutesConsts'
import styled, { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'

export function FlowSidePanel({
  workbenches,
  onAttachWorkbench,
}: {
  workbenches: WorkbenchTinyFragment[]
  onAttachWorkbench: () => void
}) {
  const theme = useTheme()
  const navigate = useNavigate()
  const hasWorkbenches = !isEmpty(workbenches)

  return (
    <WrapperSC>
      <ContentSC>
        <SectionSC $first>
          <Flex
            align="center"
            justify="space-between"
            css={{
              ...theme.partials.text.caption,
              color: theme.colors['text-xlight'],
            }}
          >
            <span>Workbenches</span>
            {hasWorkbenches && (
              <IconFrame
                clickable
                size="small"
                icon={<AddIcon size={12} />}
                tooltip="Attach workbench"
                onClick={onAttachWorkbench}
              />
            )}
          </Flex>
          {hasWorkbenches ? (
            <Flex
              gap="large"
              direction="column"
            >
              {workbenches.map((workbench) => (
                <WorkbenchPanelItem
                  key={workbench.id}
                  workbench={workbench}
                  onClick={() => navigate(getWorkbenchAbsPath(workbench.id))}
                />
              ))}
            </Flex>
          ) : (
            <>
              <Button
                small
                startIcon={<AddIcon size={12} />}
                tertiary
                onClick={onAttachWorkbench}
                css={{
                  ...theme.partials.reset.button,
                  ...theme.partials.text.body2,
                  alignSelf: 'start',
                  color: theme.colors['text-xlight'],
                  padding: 0,
                  '&:hover': {
                    ...theme.partials.reset.button,
                    ...theme.partials.text.body2,
                    color: theme.colors['text-light'],
                  },
                }}
              >
                Attach workbench
              </Button>
              <Divider
                backgroundColor="border"
                css={{ margin: `${theme.spacing.small}px 0` }}
              />
              <Flex
                direction="column"
                gap="xxsmall"
              >
                <CaptionP $color="text-xlight">
                  Connect a workbench to your workflow. Workbenches serve as
                  always-on, customizable DevOps agents that monitor alerts,
                  resolve environment issues, and manage ticket closures.
                </CaptionP>
                <a
                  href="https://www.plural.sh/blog/introducing-plural-workbenches-build-your-own-agents-for-devops/"
                  target="_blank"
                  rel="noopener noreferrer"
                  css={{
                    ...theme.partials.text.caption,
                    color: theme.colors['text-input-disabled'],
                    textDecoration: 'none',
                    width: 'fit-content',
                    '&:hover': { color: theme.colors['text-light'] },
                  }}
                >
                  Learn more use cases
                </a>
              </Flex>
            </>
          )}
        </SectionSC>
      </ContentSC>
    </WrapperSC>
  )
}

function WorkbenchPanelItem({
  workbench,
  onClick,
}: {
  workbench: WorkbenchTinyFragment
  onClick: () => void
}) {
  const [showFullDescription, setShowFullDescription] = useState(false)
  const [canExpandDescription, setCanExpandDescription] = useState(false)
  const descriptionRef = useRef<HTMLSpanElement>(null)
  const tools = workbench.tools?.filter(isNonNullable) ?? []

  useEffect(() => {
    if (!workbench.description) {
      setCanExpandDescription(false)
      return
    }

    if (showFullDescription) return

    const descriptionEl = descriptionRef.current
    if (!descriptionEl) return

    setCanExpandDescription(
      descriptionEl.scrollHeight > descriptionEl.clientHeight
    )
  }, [showFullDescription, workbench.description])

  return (
    <Flex
      align="flex-start"
      gap="small"
      width="100%"
    >
      <Flex
        direction="column"
        gap="xsmall"
        minWidth={0}
      >
        <Flex gap="xsmall">
          <WorkbenchIcon
            color="icon-light"
            size={16}
          />
          <WorkbenchNameButtonSC
            type="button"
            onClick={onClick}
          >
            {workbench.name}
          </WorkbenchNameButtonSC>
        </Flex>
        {!!workbench.description && (
          <Flex
            direction="column"
            gap="xxsmall"
          >
            <WorkbenchDescriptionSC
              ref={descriptionRef}
              $expanded={showFullDescription}
            >
              {workbench.description}
            </WorkbenchDescriptionSC>
            {canExpandDescription && (
              <ReadMoreSC
                type="button"
                onClick={() => setShowFullDescription((value) => !value)}
              >
                {showFullDescription ? 'Show less' : 'Read more'}
              </ReadMoreSC>
            )}
          </Flex>
        )}
        {!!tools.length && (
          <MetadataIcons
            items={tools.map((tool) => ({
              id: tool.id,
              label: tool.name,
              icon: (
                <WorkbenchToolIcon
                  type={tool.tool}
                  provider={tool.cloudConnection?.provider}
                  size={10}
                />
              ),
            }))}
          />
        )}
      </Flex>
    </Flex>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  backgroundColor: theme.colors['fill-one'],
  borderRight: theme.borders.default,
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
  padding: `${theme.spacing.medium}px ${theme.spacing.small}px`,
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

const WorkbenchNameButtonSC = styled.button(({ theme }) => ({
  ...theme.partials.reset.button,
  ...theme.partials.text.body2,
  ...TRUNCATE,
  color: theme.colors['text-primary-accent'],
  textAlign: 'left',
  '&:hover': {
    color: theme.colors['text-light'],
  },
}))

const WorkbenchDescriptionSC = styled.span<{ $expanded: boolean }>(
  ({ theme, $expanded }) => ({
    ...theme.partials.text.caption,
    color: theme.colors['text-xlight'],

    ...(!$expanded && {
      display: '-webkit-box',
      overflow: 'hidden',
      WebkitBoxOrient: 'vertical',
      WebkitLineClamp: 2,
    }),
  })
)

const ReadMoreSC = styled.button(({ theme }) => ({
  ...theme.partials.reset.button,
  ...theme.partials.text.caption,
  alignSelf: 'start',
  color: theme.colors['text-input-disabled'],
  '&:hover': {
    color: theme.colors['text-light'],
  },
}))
