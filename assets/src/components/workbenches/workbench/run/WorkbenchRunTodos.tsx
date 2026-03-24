import {
  Accordion,
  AccordionItem,
  CheckOutlineIcon,
  CircleDashIcon,
  Flex,
} from '@pluralsh/design-system'
import {
  WorkbenchJobResultFragment,
  WorkbenchJobResultTodoFragment,
} from 'generated/graphql'
import { isNonNullable } from 'utils/isNonNullable'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { TRUNCATE } from 'components/utils/truncate'
import { CaptionP } from 'components/utils/typography/Text'
import styled, { useTheme } from 'styled-components'

function toTodos(result?: WorkbenchJobResultFragment | null) {
  return (result?.todos ?? [])
    .filter(isNonNullable)
    .map((todo) => ({
      ...todo,
      name: todo.name?.trim() ?? '',
      description: todo.description?.trim() ?? '',
      done: !!todo.done,
    }))
    .filter((todo) => todo.name.length > 0 || todo.description.length > 0)
}

export function WorkbenchRunTodos({
  loading,
  result,
}: {
  loading: boolean
  result?: WorkbenchJobResultFragment | null
}) {
  const { spacing } = useTheme()
  const todos = toTodos(result)

  if (loading)
    return (
      <RectangleSkeleton
        $height="180px"
        $width="100%"
      />
    )

  return (
    <TodosPanelSC>
      <CaptionP $color="text-xlight">Agent todos</CaptionP>
      <Flex
        direction="column"
        gap="medium"
      >
        {todos.length > 0 ? (
          <TodoAccordionSC
            type="multiple"
            defaultValue={todos
              .filter((t) => t.description.length > 0 && !t.done)
              .map(getTodoKey)}
          >
            {todos.map(({ name, description, done }) => (
              <AccordionItem
                key={getTodoKey({ name, description })}
                value={getTodoKey({ name, description })}
                disabled={!description}
                trigger={
                  <Flex
                    align="center"
                    gap="xsmall"
                    minWidth={0}
                  >
                    {done ? (
                      <CheckOutlineIcon color="icon-light" />
                    ) : (
                      <CircleDashIcon color="icon-light" />
                    )}
                    <CaptionP
                      $color="text-light"
                      css={{ fontWeight: 700, ...TRUNCATE }}
                    >
                      {name}
                    </CaptionP>
                  </Flex>
                }
                padding="none"
                caret="right-quarter"
              >
                <CaptionP
                  $color="text-light"
                  css={{ lineHeight: '24px', paddingLeft: spacing.large }}
                >
                  {description}
                </CaptionP>
              </AccordionItem>
            ))}
          </TodoAccordionSC>
        ) : (
          <TodosEmptySC>No to-do items yet.</TodosEmptySC>
        )}
      </Flex>
    </TodosPanelSC>
  )
}

const getTodoKey = ({ name, description }: WorkbenchJobResultTodoFragment) =>
  `${name ?? 'todo'}-${description ?? 'desc'}`

const TodoAccordionSC = styled(Accordion)(({ theme }) => ({
  background: 'none',
  border: 'none',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  marginTop: 0,
}))

const TodosPanelSC = styled.div(({ theme }) => ({
  flex: 0.33,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
  borderRadius: theme.borderRadiuses.large,
  border: theme.borders.default,
  padding: theme.spacing.medium,
  width: '100%',
}))

const TodosEmptySC = styled.span(({ theme }) => ({
  color: theme.colors['text-xlight'],
  fontSize: '12px',
  letterSpacing: '0.5px',
  lineHeight: '16px',
}))
