import { useEffect, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import {
  BrowserIcon,
  Button,
  Code,
  FormField,
  GearTrainIcon,
  GlobeIcon,
  Input,
  ListBoxItem,
  ListBoxItemChipList,
  Select,
  SuccessIcon,
} from '@pluralsh/design-system'
import { ClusterDistro } from 'generated/graphql'
import { InlineLink } from 'components/utils/typography/InlineLink'
import { Body2P } from 'components/utils/typography/Text'

import { getDistroProviderIconUrl } from 'components/utils/ClusterDistro'

import { stringify } from 'yaml'

import { isEmpty } from 'lodash'

import ModalAlt, { StepBody } from './ModalAlt'
import { TagSelection } from './services/TagSelection'

export const ChipList = styled(ListBoxItemChipList)(({ theme }) => ({
  marginTop: theme.spacing.small,
  justifyContent: 'flex-start',
}))

const distributionOptions: { key: string | 'all'; label: string }[] =
  Object.keys(ClusterDistro).map((key) => ({
    key,
    label: ClusterDistro[key],
  }))

distributionOptions.unshift({
  key: 'all',
  label: 'All distributions',
})

export function YamlGeneratorModal({
  open,
  onClose,
  refetch,
  header,
  kind,
}: {
  open: boolean
  onClose: Nullable<() => void>
  refetch: Nullable<() => void>
  header: string
  kind: string
}) {
  const theme = useTheme()
  const [name, setName] = useState('')
  const [tags, setTags] = useState<Record<string, string>>({})
  const [distributionValue, setDistributionValue] = useState<
    keyof typeof ClusterDistro | 'all'
  >('all')
  const [modalStep, setModalStep] = useState<'configure' | 'copy'>('configure')

  useEffect(() => {
    if (!open) {
      setModalStep('configure')
      setName('')
      setTags({})
      setDistributionValue('all')
    }
  }, [open])

  return (
    <ModalAlt
      header={header}
      open={open}
      portal
      onClose={() => {
        onClose?.()
        refetch?.()
      }}
      asForm
      actions={
        <>
          <Button
            type="submit"
            primary
            disabled={modalStep === 'configure' && !name}
            onClick={(e) => {
              e.preventDefault()
              if (modalStep === 'configure') setModalStep('copy')
              else {
                onClose?.()
              }
            }}
          >
            {modalStep === 'configure' ? 'Continue' : 'Done'}
          </Button>
          <Button
            secondary
            type="button"
            onClick={(e) => {
              e.preventDefault()
              onClose?.()
            }}
          >
            Cancel
          </Button>
        </>
      }
    >
      <div
        css={{
          paddingBottom: theme.spacing.large,
          display: 'flex',
          flexDirection: 'column',
          rowGap: theme.spacing.medium,
        }}
      >
        <ModalIllustration modalStep={modalStep} />
        {modalStep === 'configure' ? (
          <>
            <StepBody>
              Generate a kubernetes CDR that can be placed in your GitOps repo
              whenever you prefer.{' '}
              <InlineLink
                href="https://docs.plural.sh/" /* TODO: Add more specific link */
                target="_blank"
                rel="noreferrer"
              >
                Read the docs
              </InlineLink>{' '}
              for more info.
            </StepBody>
            <FormField
              required
              label="Service name"
            >
              <Input
                value={name}
                placeholder="Name"
                onChange={(e) => {
                  setName(e.currentTarget.value)
                }}
              />
            </FormField>
            <FormField label="Cluster tags">
              <TagSelection
                {...{
                  setTags,
                  tags,
                  theme,
                }}
              />
            </FormField>
            <FormField label="Distribution">
              <Select
                leftContent={
                  distributionValue === 'all' ? (
                    <GlobeIcon size={16} />
                  ) : (
                    <img
                      width={16}
                      height={16}
                      src={getDistroProviderIconUrl({
                        distro: ClusterDistro[distributionValue],
                        provider: null,
                        mode: theme.mode,
                      })}
                    />
                  )
                }
                aria-label="Distribution"
                label="Select Distribution"
                selectedKey={distributionValue}
                onSelectionChange={(key) => {
                  setDistributionValue(key as typeof distributionValue)
                }}
                selectionMode="single"
              >
                {distributionOptions.map((p) => (
                  <ListBoxItem
                    key={p.key}
                    label={p.label}
                    leftContent={
                      p.key === 'all' ? (
                        <GlobeIcon size={16} />
                      ) : (
                        <img
                          width={16}
                          height={16}
                          src={getDistroProviderIconUrl({
                            distro: ClusterDistro[p.key],
                            provider: null,
                            mode: theme.mode,
                          })}
                        />
                      )
                    }
                  />
                ))}
              </Select>
            </FormField>
          </>
        ) : (
          <Code
            language="yaml"
            overflowY="auto"
          >
            {getYaml(
              name,
              tags,
              distributionValue === 'all'
                ? ''
                : ClusterDistro[distributionValue],
              kind
            )}
          </Code>
        )}
      </div>
    </ModalAlt>
  )
}

function ModalIllustration({ modalStep }: { modalStep: 'configure' | 'copy' }) {
  const theme = useTheme()

  return (
    <div
      css={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'start',
        padding: `0 ${theme.spacing.xlarge}px`,
      }}
    >
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: theme.spacing.small,
        }}
      >
        {modalStep === 'configure' ? (
          <GearTrainIcon
            size={20}
            color={theme.colors['icon-xlight']}
            css={{
              border: '1px solid',
              borderColor:
                modalStep === 'configure'
                  ? theme.colors['border-selected']
                  : theme.colors.border,
              borderRadius: 1000,
              padding: theme.spacing.small,
            }}
          />
        ) : (
          <SuccessIcon
            size={20}
            color={theme.colors['icon-success']}
            css={{
              border: '1px solid',
              borderColor: theme.colors.border,
              borderRadius: 1000,
              padding: theme.spacing.small,
            }}
          />
        )}

        <Body2P
          css={{
            color:
              modalStep === 'configure'
                ? theme.colors.text
                : theme.colors['text-xlight'],
          }}
        >
          Configure Service
        </Body2P>
      </div>
      <div
        css={{
          height: 1,
          flexGrow: 1,
          backgroundColor: theme.colors.border,
          margin: `${theme.spacing.large}px ${theme.spacing.xlarge}px 0`,
        }}
      />
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: theme.spacing.small,
        }}
      >
        <BrowserIcon
          size={20}
          color={theme.colors['icon-xlight']}
          css={{
            border: '1px solid',
            borderColor: theme.colors.border,
            borderRadius: 1000,
            padding: theme.spacing.small,
          }}
        />
        <Body2P
          css={{
            color:
              modalStep === 'configure'
                ? theme.colors['text-xlight']
                : theme.colors.text,
          }}
        >
          Copy YAML
        </Body2P>
      </div>
    </div>
  )
}

function getYaml(
  name: string,
  tags: Record<string, string>,
  distro: string,
  kind: string
) {
  const defaultObj: any = {
    apiVersion: 'deployments.plural.sh/v1alpha1',
    kind,
    metadata: {
      name,
      namespace: 'infra',
    },
    spec: {
      serviceRef: {
        name: 'my-service',
        namespace: 'infra',
      },
    },
  }

  if (!isEmpty(tags)) {
    defaultObj.spec.tags = tags
  }

  if (distro) {
    defaultObj.spec.distro = distro
  }

  return stringify(defaultObj)
}
