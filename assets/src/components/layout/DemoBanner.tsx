import { useContext } from 'react'

import { LoginContext } from '../contexts'
import { useTheme } from 'styled-components'
import { CaptionP } from 'components/utils/typography/Text'

export default function DemoBanner() {
  const theme = useTheme()
  const { configuration } = useContext(LoginContext)

  if (!configuration?.isDemoProject) return null

  return (
    <div
      css={{
        borderBottom: theme.borders.default,
        padding: theme.spacing.small,
      }}
    >
      <CaptionP css={{ textAlign: 'center' }}>
        You are using a Plural demo GCP project, which will expire 6 hours after
        creation. If you&apos;d like to learn how to deploy on your own
        cloud,&nbsp;
        <a
          css={{ ...theme.partials.text.inlineLink }}
          href="https://docs.plural.sh/getting-started/quickstart"
          target="_blank"
          rel="noopener noreferrer"
        >
          visit our docs.
        </a>
      </CaptionP>
    </div>
  )
}
