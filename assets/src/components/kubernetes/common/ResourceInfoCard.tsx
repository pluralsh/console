import { Card } from '@pluralsh/design-system'
import {
  FillLevel,
  FillLevelProvider,
  toFillLevel,
  useFillLevel,
} from '@pluralsh/design-system/src/components/contexts/FillLevelContext'
import {
  ComponentProps,
  PropsWithChildren,
  ReactElement,
  ReactNode,
  useMemo,
} from 'react'
import styled, { useTheme } from 'styled-components'
import { isNullish } from '@apollo/client/cache/inmemory/helpers'

interface ResourceInfoCardProps {
  title: string
  children: ReactElement | Array<ReactElement>
}

export default function ResourceInfoCard({
  title,
  children,
}: ResourceInfoCardProps): ReactElement {
  const parentFillLevel = useFillLevel()
  const theme = useTheme()

  return (
    <Card fillLevel={toFillLevel(Math.min(parentFillLevel + 1, 2))}>
      <CodeHeader fillLevel={parentFillLevel}>
        <TitleArea>{title}</TitleArea>
      </CodeHeader>

      <div
        css={{
          padding: theme.spacing.medium,
        }}
      >
        {children}
      </div>
    </Card>
  )
}

function CodeHeaderUnstyled({
  fillLevel,
  ...props
}: PropsWithChildren<ComponentProps<'div'>> & { fillLevel: FillLevel }) {
  return (
    <FillLevelProvider value={toFillLevel(fillLevel + 2)}>
      <div {...props} />
    </FillLevelProvider>
  )
}

const CodeHeader = styled(CodeHeaderUnstyled)(({ fillLevel, theme }) => ({
  minHeight: theme.spacing.xlarge + theme.spacing.xsmall * 2,
  padding: `${theme.spacing.xsmall}px ${theme.spacing.medium}px`,
  borderBottom:
    fillLevel >= 1 ? theme.borders['fill-three'] : theme.borders['fill-two'],
  backgroundColor:
    fillLevel >= 1 ? theme.colors['fill-three'] : theme.colors['fill-two'],
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: theme.spacing.medium,
  borderTopLeftRadius: theme.borderRadiuses.medium + 2,
  borderTopRightRadius: theme.borderRadiuses.medium + 2,
}))

const TitleArea = styled.div(({ theme }) => ({
  display: 'flex',
  flexGrow: 1,
  gap: theme.spacing.xsmall,
  ...theme.partials.text.overline,
  color: 'text-light',
}))

interface SectionProps {
  heading?: string
  children: Array<ReactElement>
}

export function ResourceInfoCardSection({
  heading,
  children,
}: SectionProps): Nullable<ReactElement> {
  const theme = useTheme()
  const hasChildren = useMemo(
    () => children.some((c) => !isNullish(c.props?.children)),
    [children]
  )

  if (!hasChildren) {
    return null
  }

  return (
    <div
      css={{
        marginBottom: theme.spacing.medium,
      }}
    >
      {heading && (
        <div
          css={{
            ...theme.partials.text.subtitle1,
            color: theme.colors['text-xlight'],
            marginBottom: theme.spacing.medium,
          }}
        >
          {heading}
        </div>
      )}
      <div
        css={{
          display: 'flex',
          gap: theme.spacing.medium,
          flexWrap: 'wrap',
        }}
      >
        {children}
      </div>
    </div>
  )
}

interface EntryProps {
  heading?: string
  flex?: boolean
  children: ReactNode
}

export function ResourceInfoCardEntry({
  heading,
  flex,
  children,
}: EntryProps): Nullable<ReactNode> {
  const theme = useTheme()
  const isBoolean = typeof children === 'boolean'

  if (!children && !isBoolean) {
    return null
  }

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 0,
        flexShrink: 1,
        flexBasis: flex ? '100%' : 'auto',
      }}
    >
      <div
        css={{
          ...theme.partials.text.caption,
          color: theme.colors['text-light'],
          marginBottom: theme.spacing.xxsmall,
        }}
      >
        {heading}
      </div>
      <span
        css={{
          ...theme.partials.text.body2,
          color: theme.colors.text,

          '*': {
            wordBreak: 'break-all',
          },
        }}
      >
        {isBoolean && (children ? 'true' : 'false')}
        {!isBoolean && children}
      </span>
    </div>
  )
}
