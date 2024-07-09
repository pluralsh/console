import { useTheme } from 'styled-components'
import {
  AppIcon,
  Button,
  Card,
  CardProps,
  Chip,
  ChipList,
  Code,
  FormField,
  GlobeIcon,
  Modal,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import React, { ComponentProps, ReactElement, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'

import isEqual from 'lodash/isEqual'

import { useSetPageScrollable } from '../../ContinuousDeployment'
import { OverlineH1 } from '../../../utils/typography/Text'
import { getDistroProviderIconUrl } from '../../../utils/ClusterDistro'

import { useUpdateGlobalServiceMutation } from '../../../../generated/graphql'
import { useUpdateState } from '../../../hooks/useUpdateState'
import { tagsToNameValue } from '../../services/CreateGlobalService'
import { TagSelection } from '../../services/TagSelection'
import { GqlError } from '../../../utils/Alert'
import { ModalMountTransition } from '../../../utils/ModalMountTransition'

import { deepOmitKey } from '../../../../utils/deepOmitKey'

import { ManagedNamespaceContextT, getBreadcrumbs } from './ManagedNamespace'

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
  const { namespace, refetch } = useOutletContext<ManagedNamespaceContextT>()
  const initialTags: Record<string, string> = useMemo(
    () =>
      Object.fromEntries(
        namespace?.tags
          ?.map((tag) => [tag?.name, tag?.value || ''])
          .filter((t) => !!t[0]) || []
      ),
    [namespace?.tags]
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

  if (!namespace) {
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
                id: namespace.id,
                attributes: {
                  tags: tagsToNameValue(state.tags),
                  name: namespace.name,
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

export default function ManagedNamespaceInfo() {
  const theme = useTheme()
  const { namespaceId, namespace } =
    useOutletContext<ManagedNamespaceContextT>()
  const [open, setOpen] = useState(false)

  useSetBreadcrumbs(
    useMemo(
      () => [...getBreadcrumbs(namespaceId, namespace), { label: 'info' }],
      [namespaceId, namespace]
    )
  )

  useSetPageScrollable(true)

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.large,
        height: '100%',
      }}
    >
      <div
        css={{
          display: 'grid',
          gridTemplateColumns: '1fr 2fr 1fr',
          gridAutoRows: 'min-content',
          gridGap: theme.spacing.large,
        }}
      >
        <PropCard title="Namespace">{namespace?.name}</PropCard>
        <PropCard title="Description">
          {namespace?.description ?? 'No description found'}
        </PropCard>
        <PropCard title="Distribution">
          <div
            css={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.small,
            }}
          >
            <AppIcon
              spacing="padding"
              size="xxsmall"
              icon={
                namespace?.target?.distro ? undefined : <GlobeIcon size={16} />
              }
              url={
                namespace?.target?.distro
                  ? getDistroProviderIconUrl({
                      distro: namespace?.target?.distro,
                      mode: theme.mode,
                    })
                  : undefined
              }
            />
            {namespace?.target?.distro || 'All distributions'}
          </div>
        </PropCard>
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
            values={namespace?.tags ?? []}
            transformValue={(tag) => `${tag?.name}: ${tag?.value}`}
            emptyState={<div>No tags found</div>}
          />
        </PropCard>
        <TagsModal
          open={open}
          onClose={() => setOpen(false)}
        />
        {namespace?.cascade && (
          <PropCard title="Cascade">
            {namespace.cascade.delete && <Chip>Delete</Chip>}
            {namespace.cascade.detach && <Chip>Detach</Chip>}
          </PropCard>
        )}
        {namespace?.project && (
          <PropCard title="Cascade">
            <PropCard title="Project">{namespace.project.name}</PropCard>
          </PropCard>
        )}
      </div>
      {namespace?.template ? (
        <Code
          language="JSON"
          title="Template"
          css={{ height: '100%' }}
        >
          {JSON.stringify(
            deepOmitKey(namespace?.template, '__typename' as const),
            null,
            2
          )}
        </Code>
      ) : (
        <Card
          css={{
            alignItems: 'center',
            display: 'flex',
            color: theme.colors['text-xlight'],
            justifyContent: 'center',
            padding: theme.spacing.medium,
            height: '100%',
          }}
        >
          <div>This global service is not based on service template.</div>
        </Card>
      )}
    </div>
  )
}
