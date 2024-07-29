import {
  KBarAnimator,
  KBarPortal,
  KBarPositioner,
  KBarProvider,
  KBarResults,
  KBarSearch,
  createAction,
  useKBar,
  useMatches,
  useRegisterActions,
} from 'kbar'
import {
  ComponentProps,
  Fragment,
  ReactElement,
  ReactNode,
  cloneElement,
  useContext,
  useMemo,
} from 'react'
import { type Merge } from 'type-fest'

import { ApiIcon, Chip, ClusterIcon } from '@pluralsh/design-system'
import { useNavigate } from 'react-router-dom'
import styled, { createGlobalStyle, useTheme } from 'styled-components'

import { ClusterTinyFragment, useClustersTinyQuery } from 'generated/graphql'
import {
  CD_ABS_PATH,
  CLUSTERS_REL_PATH,
  SERVICES_REL_PATH,
} from 'routes/cdRoutesConsts'
import { Edges } from 'utils/graphql'

import { InstallationContext } from '../Installations'
import { useProjectId } from '../contexts/ProjectsContext'

function ItemInner({ action, ancestors }) {
  const theme = useTheme()

  return (
    <>
      <div
        css={{
          display: 'flex',
          gap: theme.spacing.xsmall,
          fontSize: 14,
          alignItems: 'center',
        }}
      >
        {action.icon && action.icon}
        <div css={{ display: 'flex', flexDirection: 'column' }}>
          <div css={{ display: 'flex', flexDirection: 'row' }}>
            <div css={{ display: 'flex' }}>
              {ancestors.length > 0 &&
                ancestors.map((ancestor) => (
                  <Fragment key={ancestor.id}>
                    <span
                      css={{
                        opacity: 0.5,
                        marginRight: theme.spacing.xsmall,
                      }}
                    >
                      {ancestor.name}
                    </span>
                    <span css={{ marginRight: theme.spacing.xsmall }}>
                      &rsaquo;
                    </span>
                  </Fragment>
                ))}
              <span>{action.name}</span>
            </div>
            {action.suffix}
          </div>
          {action.subtitle && (
            <span style={{ fontSize: 12 }}>{action.subtitle}</span>
          )}
        </div>
      </div>
      {action.shortcut?.length ? (
        <div
          aria-hidden
          style={{ display: 'grid', gridAutoFlow: 'column', gap: '4px' }}
        >
          {action.shortcut.map((sc) => (
            <kbd
              key={sc}
              style={{
                padding: '4px 6px',
                background: 'rgba(0 0 0 / .1)',
                borderRadius: '4px',
                fontSize: 14,
              }}
            >
              {sc}
            </kbd>
          ))}
        </div>
      ) : null}
    </>
  )
}

function useActions() {
  const theme = useTheme()
  const projectId = useProjectId()
  const { applications } = useContext(InstallationContext) as any
  const { data: clustersData } = useClustersTinyQuery({
    pollInterval: 120_000,
    fetchPolicy: 'cache-and-network',
    variables: { projectId },
  })
  const clusterEdges = clustersData?.clusters?.edges

  const navigate = useNavigate()
  const actions = useMemo(
    () => buildClusterActions(clusterEdges, navigate),
    [clusterEdges, navigate, applications, theme]
  )

  return actions
}

const CommandPaletteStyles = createGlobalStyle(({ theme }) => ({
  '.cmdbar': {
    maxWidth: '600px',
    width: '100%',
    overflow: 'hidden',
    zIndex: 10000,
    background: theme.colors['fill-one'],
    border: theme.borders['fill-one'],
    boxShadow: theme.boxShadows.modal,
    borderRadius: theme.borderRadiuses.medium,
    ...theme.partials.text.body1,
    '.group-name': {
      padding: `${theme.spacing.small}px`,
      opacity: 0.5,
      ...theme.partials.text.overline,
    },
    '.search:focus-visible': {
      color: theme.colors.text,
      ...theme.partials.focus.outline,
    },
  },
}))

export const LauncherButtonSC = styled.button(({ theme }) => ({
  ...theme.partials.reset.button,
  ...theme.partials.text.buttonSmall,
  height: theme.spacing.xlarge,
  padding: `${0}px ${theme.spacing.medium}px`,
  background: theme.colors['fill-three'],
  border: theme.borders.input,
  borderRadius: theme.borderRadiuses.medium,
  color: theme.colors['text-light'],
  flex: 1,
  display: 'flex',
  alignItems: 'center',

  gap: theme.spacing.xsmall,
  '.content': {
    flexGrow: 1,
    textAlign: 'center',
  },
  '.chip': {
    backgroundColor: theme.colors['fill-three-selected'],
    borderColor: theme.colors.grey[600],
  },
  '&:hover': {
    background: theme.colors['fill-three-hover'],
  },
  '&:focus, &:focus-visible': {
    outline: 'none',
  },
  '&:focus-visible': {
    border: theme.borders['outline-focused'],
  },
}))

export default function LauncherButton({
  icon,
  cmd,
  children,
  ...props
}: Merge<
  ComponentProps<typeof LauncherButtonSC>,
  { icon: ReactElement; cmd: ReactNode; children: ReactNode }
>) {
  const iconClone = cloneElement(icon, {
    size: 16,
  })

  return (
    <LauncherButtonSC {...props}>
      {iconClone}
      <div className="content">{children}</div>
      <Chip
        className="chip"
        type="neutral"
        fillLevel={3}
        size="small"
        userSelect="none"
        whiteSpace="nowrap"
      >
        {cmd}
      </Chip>
    </LauncherButtonSC>
  )
}
