import { Flex } from 'honorable'
import { LoopingLogo, PageTitle } from '@pluralsh/design-system'

import { SMTP_Q } from 'components/graphql/plural'

import { useQuery } from '@apollo/client'

import EmailSettingsForm from './EmailSettingsForm'

export default function EmailSettings() {
  const { data } = useQuery(SMTP_Q)

  return (
    <Flex
      flexGrow={1}
      flexDirection="column"
      maxHeight="100%"
      overflow="hidden"
    >
      <PageTitle heading="Email settings" />
      {data ? <EmailSettingsForm smtp={data.smtp} /> : <LoopingLogo />}
    </Flex>
  )
}
