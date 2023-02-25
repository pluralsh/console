import { LoopingLogo } from '@pluralsh/design-system'

import { GqlError } from 'components/utils/Alert'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { useRepositoryQuery } from 'generated/graphql'
import { Div } from 'honorable'
import { capitalize } from 'lodash'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import MarkdocComponent from './MarkdocContent'

export default function AppDocs() {
  const { appName } = useParams()
  const location = useLocation()
  const { data, error } = useRepositoryQuery({
    variables: { name: appName ?? '' },
  })
  const navigate = useNavigate()

  if (error) {
    return <GqlError error={error} />
  }
  if (!data) {
    return <LoopingLogo />
  }
  if (!data.repository?.docs?.length ?? 0 > 0) {
    navigate(location.pathname.split('/').slice(0, -1).join('/'))
  }

  const displayAppName = capitalize(appName)

  return (
    <ScrollablePage heading={`${displayAppName} docs`}>
      {data.repository?.docs?.map(docPage => (
        <Div marginBottom="xxxxlarge">
          <MarkdocComponent raw={docPage?.content} />
        </Div>
      ))}
    </ScrollablePage>
  )
}
