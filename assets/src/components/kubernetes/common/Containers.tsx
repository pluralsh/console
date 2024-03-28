import {
  type ComponentProps,
  type PropsWithChildren,
  ReactElement,
  ReactNode,
  useMemo,
} from 'react'
import { Card } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'

import styled, { useTheme } from 'styled-components'

import {
  FillLevel,
  FillLevelProvider,
  toFillLevel,
  useFillLevel,
} from '@pluralsh/design-system/src/components/contexts/FillLevelContext'

import { isNullish } from '@apollo/client/cache/inmemory/helpers'

import {
  Pod_Container as ContainerT,
  Maybe,
} from '../../../generated/graphql-kubernetes'

const columnHelper = createColumnHelper<ContainerT>()

interface ContainersProps {
  containers: Array<Maybe<ContainerT>>
}

const columns = [
  // Name
  columnHelper.accessor((container) => container?.name, {
    id: 'name',
    header: 'Name',
    cell: ({ getValue }) => getValue(),
  }),
  // Image
  columnHelper.accessor((container) => container?.image, {
    id: 'image',
    header: 'Image',
    cell: ({ getValue }) => getValue(),
  }),
  // Args
  columnHelper.accessor((container) => container?.args, {
    id: 'args',
    header: 'Args',
    cell: ({ getValue }) => getValue(),
  }),
  // Status
  columnHelper.accessor((container) => container?.status?.name, {
    id: 'status',
    header: 'Status',
    cell: ({ getValue }) => getValue(),
  }),
]

export default function Containers({
  containers,
}: ContainersProps): ReactElement {
  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}
    >
      {/* <Table */}
      {/*   data={containers} */}
      {/*   columns={columns} */}
      {/*   virtualizeRows */}
      {/*   css={{ */}
      {/*     maxHeight: '500px', */}
      {/*     height: '100%', */}
      {/*   }} */}
      {/* /> */}
      {containers && containers.map((c) => <Container container={c!} />)}
    </div>
  )
}

interface ContainerProps {
  container: ContainerT
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

function Section({ heading, children }: SectionProps): Nullable<ReactElement> {
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

function Entry({ heading, flex, children }: EntryProps): Nullable<ReactNode> {
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

function Container({ container }: ContainerProps): ReactElement {
  const parentFillLevel = useFillLevel()
  const theme = useTheme()

  return (
    <Card fillLevel={toFillLevel(Math.min(parentFillLevel + 1, 2))}>
      <CodeHeader fillLevel={parentFillLevel}>
        <TitleArea>{container.name}</TitleArea>
      </CodeHeader>

      <div
        css={{
          padding: theme.spacing.medium,
        }}
      >
        <Section>
          <Entry heading="Image">{container.image}</Entry>
          <Entry heading="Container ID">{container.status?.containerID}</Entry>
          <Entry heading="Env">
            {container.env && container.env.map((e) => <div>{e?.name}</div>)}
          </Entry>
          <Entry heading="Commands">
            {container.commands &&
              container.commands.map((c) => <div>{c}</div>)}
          </Entry>
          <Entry heading="Args">
            {container.args && container.args.map((arg) => <div>{arg}</div>)}
          </Entry>
          {/* <Entry heading="Volume mounts">{container.volumeMounts}</Entry> */}
        </Section>
        <Section heading="Status">
          <Entry heading="Started">{container.status?.started}</Entry>
          <Entry heading="Ready">{container.status?.ready}</Entry>
          <Entry heading="Restarts">{container.status?.restartCount}</Entry>
        </Section>

        <Section heading="Security context">
          <Entry heading="Privileged">
            {container.securityContext?.privileged}
          </Entry>
          <Entry heading="Allow privilege escalation">
            {container.securityContext?.allowPrivilegeEscalation}
          </Entry>
          <Entry heading="Run as user">
            {container.securityContext?.runAsUser}
          </Entry>
          <Entry heading="Run as group">
            {container.securityContext?.runAsGroup}
          </Entry>
          <Entry heading="Run as non-root">
            {container.securityContext?.runAsNonRoot}
          </Entry>
          <Entry heading="Read-only root filesystem">
            {container.securityContext?.readOnlyRootFilesystem}
          </Entry>

          {/* {container.securityContext?.capabilities} */}
          {/* {container.securityContext?.seLinuxOptions} */}
          {/* {container.securityContext?.windowsOptions} */}
          {/* {container.securityContext?.procMount} */}
          {/* {container.securityContext?.seccompProfile} */}
        </Section>

        {/* <SidecarItem heading="Liveness">{container.livenessProbe}</SidecarItem> */}
        {/* <SidecarItem heading="Readines">{container.readinessProbe}</SidecarItem> */}
        {/* <SidecarItem heading="Startup">{container.startupProbe}</SidecarItem> */}
        {/* <SidecarItem heading="Resources">{container.resources}</SidecarItem> */}
      </div>
    </Card>
  )
}
