import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { SavedPromptForm } from 'components/workbenches/workbench/prompts/SavedPromptForm'

import { WorkbenchJobCreateInput } from 'components/workbenches/workbench/WorkbenchJobCreateInput'

const queryState = vi.hoisted(() => ({ promptsAvailable: true }))

vi.mock('@pluralsh/design-system', () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  ),
  EmptyState: 'div',
  Flex: ({ children }: any) => <div>{children}</div>,
  FormField: ({ children }: any) => <div>{children}</div>,
  Input: ({ value, onChange, placeholder }: any) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  ),
  ReturnIcon: 'span',
  useSetBreadcrumbs: () => {},
}))
vi.mock('components/utils/Alert', () => ({ GqlError: 'div' }))
vi.mock('components/utils/SimpleToastContext', () => ({
  useSimpleToast: () => ({ popToast: () => {} }),
}))
vi.mock('components/utils/SkeletonLoaders', () => ({
  RectangleSkeleton: 'div',
}))
vi.mock('components/utils/table/StackedText', () => ({
  StackedText: () => null,
}))
vi.mock('components/workbenches/workbench/Workbench', () => ({
  getWorkbenchBreadcrumbs: () => [],
}))
vi.mock(
  'components/workbenches/workbench/create-edit/WorkbenchCreateOrEdit',
  () => ({ FormCardSC: 'div', StickyActionsFooterSC: 'div' })
)
vi.mock('react-router-dom', () => ({
  useNavigate: () => () => {},
  useLocation: () => ({}),
  useParams: () => ({ workbenchId: 'wb', savedPromptId: 'prompt' }),
}))
vi.mock('generated/graphql', () => {
  const data = {
    workbench: {
      id: 'wb',
      modes: { budget: { tokens: 1000 } },
      prompts: {
        edges: [
          {
            node: {
              id: 'prompt',
              title: 'Existing title',
              prompt: 'Existing instruction',
              category: 'Infra',
            },
          },
        ],
      },
    },
  }
  return {
    useCreateWorkbenchJobMutation: () => [vi.fn(), {}],
    useWorkbenchQuery: () => ({ data, loading: false }),
    useWorkbenchPromptsQuery: () => ({
      data: queryState.promptsAvailable ? data : undefined,
      loading: !queryState.promptsAvailable,
    }),
    useCreateWorkbenchPromptMutation: () => [vi.fn(), {}],
    useUpdateWorkbenchPromptMutation: () => [vi.fn(), {}],
  }
})
vi.mock('components/ai/chatbot/input/ChatAttachments', () => ({
  withAttachmentHint: (s: string) => s,
}))
vi.mock('components/ai/chatbot/input/ChatInput', () => ({
  ChatOptionPill: 'div',
  ChatInputSimple: ({ options }: any) => options.props.children[0],
}))
vi.mock('components/hooks/useAutofocusRef', () => ({
  useAutofocusRef: () => ({ current: null }),
}))
vi.mock(
  'components/workbenches/workbench/WorkbenchStoredPromptMarkdown',
  () => ({ WorkbenchStoredPromptMarkdown: 'div' })
)
vi.mock('components/workbenches/workbench/WorkbenchModelSelector', () => ({
  WorkbenchModelSelector: 'div',
}))
vi.mock('components/workbenches/workbench/WorkbenchPromptControls', () => ({
  WorkbenchPromptOptionsGroup: 'div',
  WorkbenchPromptSubmitButton: 'button',
}))
vi.mock('components/workbenches/workbench/useTransientWorkbenchPrompt', () => ({
  useTransientWorkbenchPrompt: () => ({
    prompt: '',
    promptSyncKey: 0,
    setPrompt: () => {},
    setPromptSyncKey: () => {},
  }),
}))
vi.mock(
  'components/workbenches/workbench/WorkbenchPromptModeSelector/WorkbenchPromptOptionsSelector',
  async () => {
    const { updateBudgetModes } = await import(
      'components/workbenches/workbench/WorkbenchPromptModeSelector/workbenchPromptModes'
    )
    return {
      WorkbenchPromptOptionPills: 'div',
      WorkbenchPromptOptionsSelector: ({ value, onChange }: any) => (
        <button onClick={() => onChange(updateBudgetModes(value, undefined))}>
          {value?.budget ? 'Limit on' : 'Limit off'}
        </button>
      ),
    }
  }
)
beforeEach(() => {
  queryState.promptsAvailable = true
})
afterEach(cleanup)
it('loads a saved prompt when query data is already cached on mount', () => {
  const { rerender } = render(<SavedPromptForm mode="edit" />)
  expect(
    screen
      .getByPlaceholderText('e.g. Summarize recent customer feedback')
      .getAttribute('value')
  ).toBe('Existing title')
  expect(
    screen
      .getByPlaceholderText(
        'Ask the agent use an integrated tool or service on your cluster'
      )
      .getAttribute('value')
  ).toBe('Existing instruction')
  expect(
    screen.getByPlaceholderText('e.g. Development, Infra').getAttribute('value')
  ).toBe('Infra')
  const title = screen.getByPlaceholderText(
    'e.g. Summarize recent customer feedback'
  )
  fireEvent.change(title, { target: { value: 'Edited title' } })
  rerender(<SavedPromptForm mode="edit" />)
  expect(title.getAttribute('value')).toBe('Edited title')
})

it('loads a saved prompt when query data arrives after mount', () => {
  queryState.promptsAvailable = false
  const { rerender } = render(<SavedPromptForm mode="edit" />)
  queryState.promptsAvailable = true
  rerender(<SavedPromptForm mode="edit" />)
  expect(
    screen
      .getByPlaceholderText('e.g. Summarize recent customer feedback')
      .getAttribute('value')
  ).toBe('Existing title')
})

it('allows clearing a workbench default budget', () => {
  render(
    <WorkbenchJobCreateInput
      workbenchId="wb"
      workbenchLoading={false}
    />
  )
  fireEvent.click(screen.getByText('Limit on'))
  expect(screen.queryByText('Limit off')).not.toBeNull()
})
