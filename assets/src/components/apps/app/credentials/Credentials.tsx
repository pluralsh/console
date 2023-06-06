import { Code } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { useAppInfoQuery } from 'generated/graphql'
import { Flex, Span } from 'honorable'
import { useParams } from 'react-router-dom'

function AppCredentials({ info }) {
  return <Code>{info}</Code>
}

export default function Credentials() {
  const { appName } = useParams()
  const { data, error } = useAppInfoQuery({ variables: { name: appName! } })

  if (!data && !error) return <LoadingIndicator />

  return (
    <ScrollablePage heading="Credentials">
      <Flex marginBottom="medium">
        <Span>Application login and credential details are shown below</Span>
      </Flex>
      {error ? (
        <GqlError
          error={error}
          header="Cannot view app credentials"
        />
      ) : (
        <AppCredentials info={data?.application?.info} />
      )}
    </ScrollablePage>
  )
}
