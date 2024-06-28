import { useTheme } from 'styled-components'
import {
  AppIcon,
  ArrowTopRightIcon,
  Button,
  Card,
  CardProps,
  Chip,
  ChipList,
  GlobeIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import React, { ReactElement, useMemo } from 'react'

import { useNavigate, useOutletContext } from 'react-router-dom'

import { useSetPageScrollable } from '../../ContinuousDeployment'

import { OverlineH1 } from '../../../utils/typography/Text'

import { getDistroProviderIconUrl } from '../../../utils/ClusterDistro'

import { getServiceDetailsPath } from '../../../../routes/cdRoutesConsts'

import { GlobalServiceContextT, getBreadcrumbs } from './GlobalService'

function PropCard({
  title,
  titleContent,
  children,
  ...props
}: { title: string; titleContent?: ReactElement } & CardProps) {
  const theme = useTheme()

  return (
    <Card
      padding="medium"
      {...props}
      css={{ ...theme.partials.text.body2Bold }}
    >
      <div
        css={{
          alignItems: 'baseline',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <OverlineH1
          as="h3"
          css={{
            color: theme.colors['text-xlight'],
            marginBottom: theme.spacing.small,
          }}
        >
          {title}
        </OverlineH1>
        {titleContent}
      </div>
      {children}
    </Card>
  )
}

export default function GlobalServiceInfo() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { globalServiceId, globalService } =
    useOutletContext<GlobalServiceContextT>()

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getBreadcrumbs(globalServiceId, globalService),
        { label: 'info' },
      ],
      [globalServiceId, globalService]
    )
  )

  useSetPageScrollable(true)

  return (
    <div
      css={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gridGap: theme.spacing.large,
      }}
    >
      {globalService?.service && (
        <PropCard
          title="Root service"
          titleContent={
            <Button
              small
              secondary
              endIcon={<ArrowTopRightIcon />}
              onClick={() =>
                navigate(
                  getServiceDetailsPath({
                    serviceId: globalService.service?.id ?? '',
                    clusterId: globalService.service?.cluster?.id ?? '',
                  })
                )
              }
            >
              Go to root service
            </Button>
          }
          css={{ gridColumn: 'span 2' }}
        >
          {globalService.service.name}
        </PropCard>
      )}
      <PropCard
        title="Tags"
        css={{ gridColumn: 'span 2' }}
      >
        <ChipList
          limit={8}
          values={globalService?.tags ?? []}
          transformValue={(tag) => `${tag?.name}: ${tag?.value}`}
          emptyState={<div>No tags found</div>}
        />
      </PropCard>
      <PropCard title="Distribution">
        <div
          css={{
            ...theme.partials.text.body2,
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.small,
          }}
        >
          <AppIcon
            spacing="padding"
            size="xxsmall"
            icon={globalService?.distro ? undefined : <GlobeIcon size={16} />}
            url={
              globalService?.distro
                ? getDistroProviderIconUrl({
                    distro: globalService?.distro,
                    provider: globalService?.provider?.cloud,
                    mode: theme.mode,
                  })
                : undefined
            }
          />
          {globalService?.distro || 'All distribution'}
        </div>
      </PropCard>
      {globalService?.cascade && (
        <PropCard title="Cascade">
          {globalService.cascade.delete && <Chip>Delete</Chip>}
          {globalService.cascade.detach && <Chip>Detach</Chip>}
        </PropCard>
      )}
      <PropCard title="Reparent">
        <Chip severity={globalService?.reparent ? 'success' : 'danger'}>
          {globalService?.reparent ? 'True' : 'False'}
        </Chip>
      </PropCard>
      {globalService?.project && (
        <PropCard title="Cascade">
          <PropCard title="Project">{globalService.project.name}</PropCard>
        </PropCard>
      )}
    </div>
  )
}
