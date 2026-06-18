import {
  Accordion,
  AccordionItem,
  CheckOutlineIcon,
  CircleDashIcon,
  Flex,
} from '@pluralsh/design-system'
import { AgentTodoFragment } from 'generated/graphql'
import { TRUNCATE } from 'components/utils/truncate'
import { CaptionP } from 'components/utils/typography/Text'
import { isNonNullable } from 'utils/isNonNullable'
import styled, { useTheme } from 'styled-components'

function normalizeTodos(todos: AgentTodoFragment[]) {
  return todos
    .filter(isNonNullable)
    .map((todo) => ({
      ...todo,
      title: todo.title?.trim() ?? '',
      description: todo.description?.trim() ?? '',
      done: !!todo.done,
    }))
    .filter((todo) => todo.title.length > 0 || todo.description.length > 0)
}

export function AgentRunTodos({
  todos: rawTodos,
}: {
  todos: AgentTodoFragment[]
}) {
  const { spacing } = useTheme()
  const todos = normalizeTodos(rawTodos)

  return (
    <Flex
      direction="column"
      gap="medium"
    >
      {todos.length > 0 ? (
        <TodoAccordionSC
          type="multiple"
          defaultValue={todos
            .filter((t) => t.description.length > 0)
            .map(getTodoKey)}
        >
          {todos.map(({ title, description, done }) => (
            <AccordionItem
              key={getTodoKey({ title, description })}
              value={getTodoKey({ title, description })}
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
                    {title}
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
  )
}

const getTodoKey = ({
  title,
  description,
}: Pick<AgentTodoFragment, 'title' | 'description'>) =>
  `${title ?? 'todo'}-${description ?? 'desc'}`

const TodoAccordionSC = styled(Accordion)(({ theme }) => ({
  background: 'none',
  border: 'none',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  marginTop: 0,
}))

const TodosEmptySC = styled.span(({ theme }) => ({
  color: theme.colors['text-xlight'],
  fontSize: '12px',
  letterSpacing: '0.5px',
  lineHeight: '16px',
}))
