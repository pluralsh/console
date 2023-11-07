import { Code } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import {
  ComponentProps,
  Dispatch,
  SetStateAction,
  useEffect,
  useState,
} from 'react'

import { StepBody, StepH, StepLink } from 'components/cd/ModalAlt'
import { ClusterAttributes } from 'generated/graphql'

import { NameVersionHandle } from './NameVersionHandle'
import { ClusterTagSelection } from './ClusterTagSelection'
import { ClusterCreateMode } from './CreateCluster'

export function ImportClusterContent({
  importCluster,
  ...props
}: {
  importCluster: Nullable<{ deployToken?: Nullable<string> }>
} & ComponentProps<typeof ImportClusterContentPage1>) {
  if (importCluster?.deployToken) {
    return <ImportClusterContentPage2 deployToken={importCluster.deployToken} />
  }

  return <ImportClusterContentPage1 {...props} />
}

function ImportClusterContentPage1({
  onChange,
  onValidityChange,
}: {
  onChange: Dispatch<SetStateAction<Partial<ClusterAttributes>>>
  onValidityChange: Dispatch<SetStateAction<boolean>>
}) {
  const theme = useTheme()
  const [name, setName] = useState<string>('')
  const [handle, setHandle] = useState<string>('')

  useEffect(() => {
    if (name) {
      onValidityChange(true)
    } else {
      onValidityChange(false)
    }
    onChange({ name, handle })
  }, [handle, name, onChange, onValidityChange])

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.large,
      }}
    >
      <NameVersionHandle {...{ name, setName, handle, setHandle }} />
      <ClusterTagSelection mode={ClusterCreateMode.Import} />
    </div>
  )
}

function ImportClusterContentPage2({ deployToken }: { deployToken: string }) {
  const theme = useTheme()

  return (
    <>
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.medium,
        }}
      >
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing.xxsmall,
          }}
        >
          <StepH css={{}}>
            Run the below command to install the deploy operator in your cluster
          </StepH>
          <StepBody>
            Need help? Consult our{' '}
            <StepLink
              href="https://docs.plural.sh/getting-started/quickstart"
              target="_blank"
            >
              quick start guide
            </StepLink>
            .
          </StepBody>
        </div>
        <Code showLineNumbers={false}>
          {`plural cd install --url https://${window.location.host}/ext/gql -- token ${deployToken}`}
        </Code>
      </div>
      <div>
        <StepH css={{ display: 'inline' }}>Notice: </StepH>
        <p
          css={{
            ...theme.partials.text.caption,
            color: theme.colors['text-light'],
            display: 'inline',
          }}
        >
          Make sure your kubeconfig points to the desired cluster for import.
        </p>
      </div>
    </>
  )
}
