import { type ItemProps, type SelectionMode } from '@react-types/shared'
import {
  type ComponentPropsWithRef,
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactNode,
} from 'react'
import styled from 'styled-components'

import theme from 'honorable-theme-default'

import Flex from './Flex'
import CheckRoundedIcon from './icons/CheckRoundedIcon'
import PlusIcon from './icons/PlusIcon'
import ChipList from './ListBoxItemChipList'
import Checkbox from './Checkbox'

type ListBoxItemBaseProps = {
  focused?: boolean
  selected?: boolean
  disabled?: boolean
  label?: ReactNode
  description?: ReactNode
  key?: string
  labelProps?: ComponentPropsWithoutRef<ElementType>
  descriptionProps?: ComponentPropsWithoutRef<ElementType>
  selectionMode?: SelectionMode
} & ComponentPropsWithRef<'div'> &
  Omit<ItemProps<void>, 'children'>

type ListBoxItemProps = {
  leftContent?: ReactNode
  rightContent?: ReactNode
  destructive?: boolean
} & ListBoxItemBaseProps

const ListBoxItemInner = styled.div<Partial<ListBoxItemProps>>(
  ({ theme, disabled, focused, destructive }) => ({
    display: 'flex',
    gap: theme.spacing.small,
    alignItems: 'center',
    position: 'relative',
    width: 'auto',
    padding: `${theme.spacing.xsmall}px ${theme.spacing.medium}px`,
    backgroundColor: 'none',
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: !disabled
        ? theme.mode === 'light'
          ? theme.colors['fill-one-hover']
          : theme.colors['fill-two-hover']
        : 'none',
    },
    '&:focus, &:focus-visible': {
      outline: 'none',
    },
    '&:last-child': {
      borderBottom: 'none',
    },
    '&:focus-visible::after': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      ...theme.partials.focus.outline,
    },
    ...(focused ? { '&': { ...theme.partials.focus.outline } } : {}),
    '.center-content': {
      flexGrow: 1,
      width: 'max-content',
    },
    '.label': {
      ...theme.partials.text.body2,
      color: disabled
        ? theme.colors['text-primary-disabled']
        : destructive
        ? theme.colors['text-danger-light']
        : theme.colors.text,
    },
    '.description': {
      ...theme.partials.text.caption,
      color: theme.colors['text-xlight'],
    },
  })
)

function ListBoxItem({
  ref,
  selected,
  label,
  labelProps = {},
  description,
  descriptionProps = {},
  leftContent,
  rightContent,
  selectionMode,
  ...props
}: ListBoxItemProps) {
  return (
    <ListBoxItemInner
      ref={ref}
      selected={selected}
      {...props}
    >
      {selectionMode === 'multiple' && (
        <Checkbox
          small
          checked={!!selected}
          style={{ paddingLeft: 0 }}
        />
      )}
      {leftContent && <Flex>{leftContent}</Flex>}
      <div className="center-content">
        {label && (
          <div
            className="label"
            {...labelProps}
          >
            {label}
          </div>
        )}
        {description && (
          <div
            className="description"
            {...descriptionProps}
          >
            {description}
          </div>
        )}
      </div>
      {rightContent && <Flex>{rightContent}</Flex>}
      {selectionMode === 'single' && selected && <CheckRoundedIcon size={16} />}
    </ListBoxItemInner>
  )
}

type ListBoxFooterProps = ComponentPropsWithRef<typeof ListBoxFooterInner> & {
  children: ReactNode
  leftContent?: ReactNode
  rightContent?: ReactNode
}
const ListBoxFooterInner = styled.button<{ $focused?: boolean }>(
  ({ theme, $focused: focused = false }) => ({
    ...theme.partials.reset.button,
    display: 'flex',
    position: 'relative',
    width: '100%',
    padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
    '&:hover': {
      backgroundColor:
        theme.mode === 'light'
          ? theme.colors['fill-one-hover']
          : theme.colors['fill-two-hover'],
    },
    '.children': {
      flexGrow: 1,
    },
    '.leftContent': {
      display: 'flex',
      marginRight: theme.spacing.medium,
    },
    '.rightContent': {
      display: 'flex',
      marginLeft: theme.spacing.medium,
    },
    '&:focus, &:focus-visible': {
      outline: 'none',
    },
    '&:focus-visible::after': {
      ...theme.partials.focus.insetAbsolute,
    },
    ...(focused
      ? {
          '&::after': { ...theme.partials.focus.insetAbsolute },
        }
      : {}),
  })
)

function ListBoxFooter({
  ref,
  leftContent,
  rightContent,
  children,
  ...props
}: ListBoxFooterProps) {
  return (
    <ListBoxFooterInner
      tabIndex={0}
      ref={ref}
      {...props}
    >
      {leftContent && <div className="leftContent">{leftContent}</div>}
      <div className="children">{children}</div>
      {rightContent && <div className="rightContent">{rightContent}</div>}
    </ListBoxFooterInner>
  )
}

const ListBoxFooterPlusInner = styled(ListBoxFooter)(({ theme }) => ({
  color: theme.colors['text-primary-accent'],
}))

function ListBoxFooterPlus({
  ref,
  leftContent,
  children,
  ...props
}: ListBoxFooterProps) {
  return (
    <ListBoxFooterPlusInner
      ref={ref}
      leftContent={
        leftContent || (
          <PlusIcon
            size={16}
            color={theme.colors['text-primary-accent'] as string}
          >
            {children || 'Add'}
          </PlusIcon>
        )
      }
      {...props}
    >
      {children}
    </ListBoxFooterPlusInner>
  )
}

export {
  ListBoxFooter,
  ListBoxFooterPlus,
  ListBoxItem,
  ChipList as ListBoxItemChipList,
}
export type {
  ListBoxFooterProps as ListBoxFooterPlusProps,
  ListBoxFooterProps,
  ListBoxItemBaseProps,
  ListBoxItemProps,
}
