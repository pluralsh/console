import { Card } from '@pluralsh/design-system'
import { Overline } from 'components/cd/utils/PermissionsModal'
import { FormBindings } from 'components/utils/bindings'
import type { PolicyBindingFragment } from 'generated/graphql'
import type { ComponentProps, ReactNode } from 'react'
import styled from 'styled-components'

type PolicyBindingsCardFormLayout = 'vertical' | 'horizontal'
type BindingHints = ComponentProps<typeof FormBindings>['hints']

export type PolicyBindingsCardFormProps = ComponentProps<typeof Card> & {
  readBindings: PolicyBindingFragment[]
  writeBindings: PolicyBindingFragment[]
  onReadBindingsChange: (next: PolicyBindingFragment[]) => void
  onWriteBindingsChange: (next: PolicyBindingFragment[]) => void
  layout?: PolicyBindingsCardFormLayout
  readTitle?: ReactNode
  writeTitle?: ReactNode
  readHints?: BindingHints
  writeHints?: BindingHints
}

export function PolicyBindingsCardForm({
  readBindings,
  writeBindings,
  onReadBindingsChange,
  onWriteBindingsChange,
  layout = 'vertical',
  readTitle = 'Read permissions',
  writeTitle = 'Write permissions',
  readHints = {
    user: 'Users with read permissions',
    group: 'Groups with read permissions',
  },
  writeHints = {
    user: 'Users with write permissions',
    group: 'Groups with write permissions',
  },
  ...props
}: PolicyBindingsCardFormProps) {
  return (
    <>
      <CardSC {...props}>
        <Overline>{readTitle}</Overline>
        <FormBindings
          bindings={readBindings}
          setBindings={onReadBindingsChange}
          hints={readHints}
          layout={layout}
        />
      </CardSC>
      <CardSC {...props}>
        <Overline>{writeTitle}</Overline>
        <FormBindings
          bindings={writeBindings}
          setBindings={onWriteBindingsChange}
          hints={writeHints}
          layout={layout}
        />
      </CardSC>
    </>
  )
}

const CardSC = styled(Card)(({ theme }) => ({
  padding: theme.spacing.large,
  minWidth: 150,
  maxWidth: '100%',
  gap: theme.spacing.large,
  display: 'flex',
  flexDirection: 'column',
}))
