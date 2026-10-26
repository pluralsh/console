import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { ThemeProvider } from 'styled-components'
import { afterEach, expect, it, vi } from 'vitest'

import { WorkbenchToolsEditModal } from './WorkbenchToolsEditModal'

const navigate = vi.hoisted(() => vi.fn())

vi.mock('@pluralsh/design-system', () => ({
  AddIcon: 'span',
  Button: ({ children, onClick, disabled }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  ),
  Card: 'div',
  Chip: ({ children }: any) => (
    <span data-testid="selected-count">{children}</span>
  ),
  CloseIcon: 'span',
  Flex: ({ children }: any) => <div>{children}</div>,
  FormField: ({ children }: any) => <div>{children}</div>,
  IconFrame: () => null,
  ListBoxFooterPlus: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
  ListBoxItem: () => null,
  Modal: ({ open, children, actions }: any) =>
    open ? (
      <div>
        {children}
        {actions}
      </div>
    ) : null,
  Select: ({ triggerButton, dropdownFooterFixed }: any) => (
    <div>
      {triggerButton}
      {dropdownFooterFixed}
    </div>
  ),
  SelectButton: ({ children }: any) => <div>{children}</div>,
}))
vi.mock('components/self-service/catalog/CatalogsGrid', () => ({
  CardGrid: 'div',
}))
vi.mock('components/utils/Alert', () => ({ GqlError: 'div' }))
vi.mock('components/utils/SimpleToastContext', () => ({
  useSimpleToast: () => ({ popToast: () => {} }),
}))
vi.mock('components/utils/table/StackedText', () => ({
  StackedText: () => null,
}))
vi.mock('components/utils/table/useFetchPaginatedData', () => ({
  useFetchPaginatedData: () => ({ data: undefined, loading: false }),
}))
vi.mock('generated/graphql', () => ({
  useUpdateWorkbenchMutation: () => [() => {}, { loading: false }],
}))
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }))
vi.mock('../tools/workbenchToolsUtils', () => ({
  getWorkbenchToolLabel: () => '',
  WorkbenchToolCardBody: 'div',
  workbenchToolCardGridStyles: () => ({}),
  WorkbenchToolIcon: () => null,
}))

const workbench = {
  id: 'wb',
  name: 'Workbench',
  tools: [{ id: 'existing' }],
} as any

afterEach(() => {
  cleanup()
  navigate.mockReset()
})

// only the spacing the modal's styled components read
const theme = { spacing: { medium: 16, xxsmall: 4 } } as any

const renderModal = (
  props: Partial<ComponentProps<typeof WorkbenchToolsEditModal>>
) =>
  render(
    <ThemeProvider theme={theme}>
      <WorkbenchToolsEditModal
        workbench={workbench}
        open
        onClose={() => {}}
        {...props}
      />
    </ThemeProvider>
  )

const selectedCount = () => screen.getByTestId('selected-count').textContent
const saveButton = () =>
  screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement

it('preselects a newly added tool alongside the current ones', () => {
  renderModal({ addedToolId: 'added' })

  expect(selectedCount()).toBe('2')
  expect(saveButton().disabled).toBe(false)
})

it('does not duplicate an added tool that is already associated', () => {
  renderModal({ addedToolId: 'existing' })

  expect(selectedCount()).toBe('1')
  expect(saveButton().disabled).toBe(true)
})

it('closes before navigating to tool creation for this workbench', () => {
  const onClose = vi.fn()

  renderModal({ onClose })
  fireEvent.click(screen.getByRole('button', { name: 'Create tool' }))

  expect(onClose).toHaveBeenCalledOnce()
  expect(navigate).toHaveBeenCalledWith(
    expect.stringContaining('returnToWorkbench=wb')
  )
})
