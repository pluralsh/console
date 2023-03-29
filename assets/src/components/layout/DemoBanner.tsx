import { A, Div, P } from 'honorable'
import { useContext } from 'react'

import { LoginContext } from '../contexts'

export default function DemoBanner() {
  const { configuration } = useContext(LoginContext)

  if (!configuration?.isDemoProject) return null

  return (
    <Div
      borderBottom="1px solid border"
      padding="small"
    >
      <P
        caption
        textAlign="center"
      >
        You are using a Plural demo GCP project, which will expire 6 hours after
        creation. If you'd like to learn how to deploy on your own cloud,&nbsp;
        <A
          inline
          href="https://docs.plural.sh/getting-started/quickstart"
          target="_blank"
          rel="noopener noreferrer"
        >
          visit our docs.
        </A>
      </P>
    </Div>
  )
}
