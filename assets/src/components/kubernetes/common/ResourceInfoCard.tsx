import {
  ComponentProps,
  PropsWithChildren,
  ReactElement,
  ReactNode,
  useMemo,
} from 'react'
import styled, { useTheme } from 'styled-components'
import { isNullish } from '@apollo/client/cache/inmemory/helpers'
import {
  Card,
  CheckIcon,
  CloseIcon,
  FillLevel,
  FillLevelProvider,
  toFillLevel,
  useFillLevel,
} from '@pluralsh/design-system'
import isArray from 'lodash/isArray'

const Skeleton = styled(SkeletonUnstyled)(({ theme }) => ({
  '@keyframes moving-gradient': {
    '0%': { backgroundPosition: '-250px 0' },
    '100%': { backgroundPosition: '250px 0' },
  },

  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.large,

  '.title': {
    borderRadius: theme.borderRadiuses.medium,
    display: 'block',
    width: '100px',
    height: '20px',
    background: `linear-gradient(to right, ${theme.colors.border} 20%, ${theme.colors['border-fill-two']} 50%, ${theme.colors.border} 80%)`,
    backgroundSize: '500px 100px',
    animation: 'moving-gradient 2s infinite linear forwards',
  },

  '.section': {
    display: 'flex',
    gap: theme.spacing.large,
    flexWrap: 'wrap',
  },

  span: {
    borderRadius: theme.borderRadiuses.medium,
    display: 'block',
    width: '250px',
    height: '12px',
    background: `linear-gradient(to right, ${theme.colors.border} 20%, ${theme.colors['border-fill-two']} 50%, ${theme.colors.border} 80%)`,
    backgroundSize: '500px 100px',
    animation: 'moving-gradient 2s infinite linear forwards',
  },
}))

function SkeletonUnstyled({ ...props }): ReactElement {
  return (
    <div {...props}>
      <div className="title" />
      <div className="section">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="title" />
      <div className="section">
        <span />
        <span />
      </div>
    </div>
  )
}

interface ResourceInfoCardProps {
  title?: ReactNode
  loading?: boolean
  children: ReactElement | Array<ReactElement> | undefined | null
}

export default function ResourceInfoCard({
  title,
  loading = false,
  children,
}: ResourceInfoCardProps): ReactElement {
  const parentFillLevel = useFillLevel()
  const theme = useTheme()
  const content = useMemo(
    () => (loading ? <Skeleton /> : children),
    [children, loading]
  )

  return (
    <Card fillLevel={toFillLevel(Math.min(parentFillLevel + 1, 2))}>
      {title && (
        <CodeHeader fillLevel={parentFillLevel}>
          <TitleArea>{title}</TitleArea>
        </CodeHeader>
      )}
      <div
        css={{
          padding: theme.spacing.medium,
        }}
      >
        {content}
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
  children: Array<ReactElement> | ReactElement
}

export function ResourceInfoCardSection({
  heading,
  children,
}: SectionProps): Nullable<ReactElement> {
  const theme = useTheme()
  const hasChildren = useMemo(
    () =>
      isArray(children)
        ? children.some((c) => !isNullish(c.props?.children))
        : !!children,
    [children]
  )

  if (!hasChildren) {
    return null
  }

  return (
    <div css={{ marginBottom: theme.spacing.medium }}>
      {heading && (
        <div
          css={{
            ...theme.partials.text.subtitle2,
            color: theme.colors['text-light'],
            marginBottom: theme.spacing.small,
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
        {isBoolean && (children ? <CheckIcon /> : <CloseIcon />)}
        {!isBoolean && children}
      </span>
    </div>
  )
}
