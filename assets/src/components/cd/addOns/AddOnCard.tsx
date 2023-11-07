import { FormEvent, useCallback, useMemo, useState } from 'react'
import {
  AppIcon,
  Button,
  Card,
  ClusterIcon,
  FormField,
  GlobeIcon,
  Input,
  ListBoxItem,
  Select,
  SelectPropsSingle,
  Tooltip,
} from '@pluralsh/design-system'
import styled, { useTheme } from 'styled-components'
import upperFirst from 'lodash/upperFirst'

import {
  AddOnConfigurationFragment,
  ClusterAddOnFragment,
  ClusterTinyFragment,
  GlobalServiceAttributes,
  useClustersTinySuspenseQuery,
  useInstallAddOnMutation,
} from 'generated/graphql'

import { Body1BoldP } from 'components/utils/typography/Text'
import { toNiceVersion } from 'utils/semver'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'
import { SetNonNullable, SetRequired } from 'type-fest'
import { GqlError } from 'components/utils/Alert'

import ProviderIcon from 'components/utils/Provider'

import { mapExistingNodes } from 'utils/graphql'

import { useOpenTransition } from 'components/hooks/suspense/useOpenTransition'

import ModalAlt from '../ModalAlt'

export const versionName = (vsn: string) =>
  vsn.startsWith('v') ? vsn : `v${vsn}`

const AddOnCardSC = styled(Card)(({ theme }) => ({
  '&&': {
    position: 'relative',
    display: 'flex',
    minWidth: 450,
    padding: theme.spacing.small,
    gap: theme.spacing.small,
    alignItems: 'center',
  },

  '.version': {
    display: 'flex',
    flexAlign: 'center',
  },
  '.content': {
    display: 'flex',
    flexGrow: 1,
    flexDirection: 'column',
  },
  '.contentTop': {
    display: 'flex',
    gap: theme.spacing.xsmall,
  },
  '.globalIcon': {
    display: 'flex',
    alignItems: 'center',
  },
}))

export default function AddOnCard({ addOn }: { addOn: ClusterAddOnFragment }) {
  const theme = useTheme()

  if (!addOn) return null

  const { name, global, icon, version } = addOn

  return (
    <AddOnCardSC>
      {icon && (
        <AppIcon
          url={icon}
          size="xsmall"
        />
      )}
      <div className="content">
        <div className="contentTop">
          <Body1BoldP as="h3">{name}</Body1BoldP>
          {global && (
            <div className="globalIcon">
              <Tooltip
                label="Global"
                placement="top"
              >
                <GlobeIcon
                  size={14}
                  color={theme.colors['icon-light']}
                />
              </Tooltip>
            </div>
          )}
        </div>
        {version && <div className="version">{toNiceVersion(version)}</div>}
      </div>
      <div className="actions">
        <InstallAddOn addOn={addOn} />
      </div>
    </AddOnCardSC>
  )
}

export function InstallAddOn({
  addOn,
}: {
  addOn: Nullable<ClusterAddOnFragment>
}) {
  const [isOpen, setIsOpen] = useState(false)
  const { buttonProps } = useOpenTransition(isOpen, setIsOpen)

  return (
    <>
      <Button
        small
        secondary
        {...buttonProps}
      >
        Install
      </Button>
      <ModalMountTransition open={isOpen}>
        <InstallAddOnModal
          addOn={addOn}
          open={isOpen}
          onClose={() => setIsOpen(false)}
        />
      </ModalMountTransition>
    </>
  )
}

export function InstallAddOnModal({
  addOn,
  open,
  onClose,
  refetch,
}: {
  addOn: Nullable<ClusterAddOnFragment>
  open: boolean
  onClose: Nullable<() => void>
  refetch?: Nullable<() => void>
}) {
  const theme = useTheme()
  const configuration =
    addOn?.configuration?.filter(
      (
        a
      ): a is SetRequired<
        SetNonNullable<AddOnConfigurationFragment, 'name'>,
        'name'
      > => !!a?.name
    ) || []
  const [configVals, setConfigVals] = useState(
    Object.fromEntries(configuration.map((cfg) => [cfg?.name, '']))
  )
  const [clusterId, setClusterId] = useState('')
  const [name, setName] = useState('')
  const { data } = useClustersTinySuspenseQuery()
  const [globalProps, _setGlobalProps] = useState<
    GlobalServiceAttributes | undefined
  >()

  const [updateService, { loading, error }] = useInstallAddOnMutation({
    variables: {
      clusterId,
      name,
      configuration: Object.entries(configVals).map(([name, value]) => ({
        name,
        value,
      })),
      global: globalProps,
    },
    onCompleted: () => {
      refetch?.()
      onClose?.()
    },
  })
  const closeModal = useCallback(() => {
    onClose?.()
  }, [onClose])

  const disabled = !(name && clusterId && (!addOn?.global || globalProps))
  const onSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      if (disabled) {
        return
      }
      updateService()
    },
    [disabled, updateService]
  )
  const clusters = useMemo(
    () => mapExistingNodes(data.clusters),
    [data.clusters]
  )

  return (
    <ModalAlt
      header={`Install add-on – ${addOn?.name}`}
      open={open}
      portal
      onClose={closeModal}
      asForm
      formProps={{ onSubmit }}
      actions={
        <>
          <Button
            type="submit"
            disabled={disabled}
            loading={loading}
            primary
          >
            Install
          </Button>
          <Button
            type="button"
            secondary
            onClick={closeModal}
          >
            Cancel
          </Button>
        </>
      }
    >
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.medium,
        }}
      >
        <ClusterSelect
          label="Select cluster"
          clusters={clusters}
          selectedKey={clusterId}
          onSelectionChange={(key) => setClusterId(key as string)}
        />
        <FormField
          required
          label="Name"
        >
          <Input
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
          />
        </FormField>
        {configuration.map((cfg) => (
          <FormField
            label={cfg?.name}
            hint={upperFirst(cfg?.documentation || '')}
          >
            <Input
              value={configVals[cfg.name]}
              onChange={(e) => {
                setConfigVals({
                  ...configVals,
                  [cfg.name]: e.currentTarget.value,
                })
              }}
            />
          </FormField>
        ))}
        <div>TODO: Add global settings</div>
      </div>
      {error && (
        <GqlError
          header="Problem installing add-on"
          error={error}
        />
      )}
    </ModalAlt>
  )
}

function ClusterSelect({
  clusters,

  ...props
}: { clusters: ClusterTinyFragment[] } & Omit<SelectPropsSingle, 'children'>) {
  const theme = useTheme()
  const { selectedKey } = props

  const currentCluster = clusters.find((cluster) => cluster.id === selectedKey)

  return (
    <Select
      titleContent={
        <div css={{ display: 'flex', gap: theme.spacing.xsmall }}>
          <ClusterIcon />
          Cluster
        </div>
      }
      leftContent={
        <ProviderIcon
          provider={currentCluster?.provider?.cloud || ''}
          width={16}
        />
      }
      {...props}
    >
      {clusters.map((cluster) => (
        <ListBoxItem
          key={cluster.id}
          label={cluster.name}
          textValue={cluster.name}
          leftContent={
            <ProviderIcon
              provider={cluster.provider?.cloud || ''}
              width={16}
            />
          }
        />
      ))}
    </Select>
  )
}
