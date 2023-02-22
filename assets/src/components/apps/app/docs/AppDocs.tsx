import { LoopingLogo } from '@pluralsh/design-system'

import { GqlError } from 'components/utils/Alert'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { useRepositoryQuery } from 'generated/graphql'
import { Div } from 'honorable'
import { capitalize } from 'lodash'
import { useParams } from 'react-router-dom'

import MarkdocComponent from './MarkdocContent'

export default function AppDocs() {
  const { appName } = useParams()
  const { data, error } = useRepositoryQuery({
    variables: { name: appName ?? '' },
  })

  if (error) {
    return <GqlError error={error} />
  }
  if (!data) {
    return <LoopingLogo />
  }

  const displayAppName = capitalize(appName)

  return (
    <ScrollablePage heading={`${displayAppName} docs`}>
      {data.repository?.docs?.map(docPage => (
        <Div marginBottom="large"><MarkdocComponent raw={docPage?.content} /></Div>
      ))}
    </ScrollablePage>
  )
}
