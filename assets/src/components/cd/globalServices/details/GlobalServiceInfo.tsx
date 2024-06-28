import { useTheme } from 'styled-components'
import {
  AppIcon,
  ArrowTopRightIcon,
  Button,
  Card,
  CardProps,
  Chip,
  ChipList,
  FormField,
  GlobeIcon,
  Modal,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import React, { ComponentProps, ReactElement, useMemo, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'

import isEqual from 'lodash/isEqual'

import { useSetPageScrollable } from '../../ContinuousDeployment'
import { OverlineH1 } from '../../../utils/typography/Text'
import { getDistroProviderIconUrl } from '../../../utils/ClusterDistro'
import { getServiceDetailsPath } from '../../../../routes/cdRoutesConsts'

import { useUpdateGlobalServiceMutation } from '../../../../generated/graphql'
import { useUpdateState } from '../../../hooks/useUpdateState'
import { tagsToNameValue } from '../../services/CreateGlobalService'
import { TagSelection } from '../../services/TagSelection'
import { GqlError } from '../../../utils/Alert'
import { ModalMountTransition } from '../../../utils/ModalMountTransition'

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

function TagsModalInner({
  open,
  onClose,
  ...props
}: ComponentProps<typeof Modal>) {
  const theme = useTheme()
  const { globalService, refetch } = useOutletContext<GlobalServiceContextT>()
  const initialTags: Record<string, string> = useMemo(
    () =>
      Object.fromEntries(
        globalService?.tags
          ?.map((tag) => [tag?.name, tag?.value || ''])
          .filter((t) => !!t[0]) || []
      ),
    [globalService?.tags]
  )

  const {
    state,
    update: updateState,
    hasUpdates,
  } = useUpdateState({ tags: initialTags }, { tags: (a, b) => !isEqual(a, b) })
  const [mutation, { loading, error }] = useUpdateGlobalServiceMutation({
    onCompleted: () => {
      refetch?.()
      onClose?.()
    },
  })

  if (!globalService) {
    return null
  }

  return (
    <Modal
      asForm
      portal
      open={open}
      onClose={onClose}
      header="Edit tags"
      formProps={{
        onSubmit: (e) => {
          e.preventDefault()
          if (hasUpdates) {
            mutation({
              variables: {
                id: globalService.id,
                attributes: {
                  tags: tagsToNameValue(state.tags),
                  name: globalService.name,
                },
              },
            })
          }
        },
      }}
      actions={
        <div
          css={{
            display: 'flex',
            flexDirection: 'row-reverse',
            gap: theme.spacing.medium,
          }}
        >
          <Button
            primary
            type="submit"
            disabled={!hasUpdates}
            loading={loading}
          >
            Submit
          </Button>
          <Button
            secondary
            type="button"
            onClick={() => {
              onClose?.()
            }}
          >
            Cancel
          </Button>
        </div>
      }
      {...props}
    >
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.large,
        }}
      >
        <FormField label="Tags">
          <TagSelection
            tags={state.tags}
            setTags={(tags) => updateState({ tags })}
          />
        </FormField>
        {error && <GqlError error={error} />}
      </div>
    </Modal>
  )
}

export function TagsModal(props: ComponentProps<typeof TagsModalInner>) {
  return (
    <ModalMountTransition open={!!props.open}>
      <TagsModalInner {...props} />
    </ModalMountTransition>
  )
}

export default function GlobalServiceInfo() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { globalServiceId, globalService } =
    useOutletContext<GlobalServiceContextT>()
  const [open, setOpen] = useState(false)

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
        titleContent={
          <Button
            small
            secondary
            onClick={() => setOpen(true)}
          >
            Edit tags
          </Button>
        }
        css={{ gridColumn: 'span 2' }}
      >
        <ChipList
          limit={8}
          values={globalService?.tags ?? []}
          transformValue={(tag) => `${tag?.name}: ${tag?.value}`}
          emptyState={<div>No tags found</div>}
        />
      </PropCard>
      <TagsModal
        open={open}
        onClose={() => setOpen(false)}
      />
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
