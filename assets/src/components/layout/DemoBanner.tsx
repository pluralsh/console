import { useContext } from 'react'
import { useTheme } from 'styled-components'

import { LoginContext } from '../contexts'

export default function DemoBanner() {
  const { configuration } = useContext(LoginContext)
  const theme = useTheme()

  if (!configuration?.isDemoProject) return null

  return (
    <div
      css={{
        borderBottom: '1px solid border',
        padding: 'small',
      }}
    >
      <p
        css={{
          ...theme.partials.text.caption,
          textAlign: 'center',
        }}
      >
        You are using a Plural demo GCP project, which will expire 6 hours after
        creation. If you'd like to learn how to deploy on your own cloud,{' '}
        <a
          css={{
            ...theme.partials.text.inlineLink,
          }}
          href="https://docs.plural.sh/getting-started/quickstart"
          target="_blank"
          rel="noopener noreferrer"
        >
          visit our docs.
        </a>
      </p>
    </div>
  )
}
