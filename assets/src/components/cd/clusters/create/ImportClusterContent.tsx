import { Codeline } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import { StepBody, StepH, StepLink } from 'components/cd/ModalAlt'

import {
  ComponentProps,
  Dispatch,
  SetStateAction,
  useEffect,
  useState,
} from 'react'

import { ClusterAttributes } from '../../../../generated/graphql'

import { NameVersionHandle } from './NameVersionHandle'

export function ImportClusterContent({
  importCluster,
  ...props
}: {
  importCluster: any
} & ComponentProps<typeof ImportClusterContentPage1>) {
  if (importCluster) {
    return <ImportClusterContentPage2 deployToken={importCluster.deployToken} />
  }

  return <ImportClusterContentPage1 {...props} />
}

function ImportClusterContentPage1({
  onChange,
  onValidityChange,
}: {
  onChange: Dispatch<SetStateAction<ClusterAttributes>>
  onValidityChange: Dispatch<SetStateAction<boolean>>
}) {
  const [name, setName] = useState<string>('')
  const [handle, setHandle] = useState<string>('')
  const [version, setVersion] = useState<string>('')

  useEffect(() => {
    if (name && version) {
      onValidityChange(true)
    } else {
      onValidityChange(false)
    }
    onChange({ name, handle, version })
  }, [handle, name, onChange, onValidityChange, version])

  return (
    <NameVersionHandle
      {...{ name, setName, version, setVersion, handle, setHandle }}
    />
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
        <Codeline>
          {`plural cd install --url <console-url> -- token ${deployToken}`}
        </Codeline>
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
