import { SMTP_Q } from 'components/graphql/plural'
import { useQuery } from '@apollo/client'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import LoadingIndicator from 'components/utils/LoadingIndicator'

import EmailSettingsForm from './EmailSettingsForm'

export default function EmailSettings() {
  const { data } = useQuery(SMTP_Q)

  return (
    <ScrollablePage
      scrollable={false}
      heading="Email settings"
    >
      {data ? <EmailSettingsForm smtp={data.smtp} /> : <LoadingIndicator />}
    </ScrollablePage>
  )
}
