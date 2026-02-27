import {
  AppIcon,
  ArrowRightIcon,
  Card,
  Flex,
  IconFrame,
  WorkbenchIcon,
} from '@pluralsh/design-system'
import { StackedText } from 'components/utils/table/StackedText'
import { Body2P } from 'components/utils/typography/Text'
import { WorkbenchTinyFragment } from 'generated/graphql'
import { Link } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'

export function WorkbenchesList() {
  const { spacing } = useTheme()
  return (
    <Flex
      direction="column"
      gap="large"
    >
      <StackedText
        first={
          <Flex
            align="center"
            height={40}
            gap="xsmall"
          >
            <IconFrame
              size="small"
              icon={<WorkbenchIcon />}
            />
            <span>Workbenches</span>
          </Flex>
        }
        firstPartialType="body2Bold"
        firstColor="text"
        second="Configurable, reusable agent definitions for common DevOps tasks. Each workbench bundles prompts, tools, and skills that can spawn multiple agents on demand."
        secondPartialType="body2"
        secondColor="text-light"
        gap="xsmall"
        css={{ maxWidth: 840 }}
      />
    </Flex>
  )
}

function WorkbenchCard({ workbench }: { workbench: WorkbenchTinyFragment }) {
  return (
    <CardSC
      as={Link}
      to={workbench.id}
    >
      <Flex
        direction="column"
        gap="xsmall"
      >
        <StackedText
          first={workbench.name}
          firstPartialType="body2Bold"
          firstColor="text"
          second={workbench.repository?.httpsPath}
        />

        <Body2P $color="text-light">{workbench.description}</Body2P>
        <Flex gap="xsmall">
          {workbench.tools?.map((tool) => (
            <div key={tool?.id}>{tool?.name}</div>
          )) ?? []}
        </Flex>
      </Flex>
      <AppIcon
        size="xsmall"
        icon={<ArrowRightIcon />}
      />
    </CardSC>
  )
}

const CardSC = styled(Card)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.small,
  padding: theme.spacing.medium,
  height: '100%',
}))
