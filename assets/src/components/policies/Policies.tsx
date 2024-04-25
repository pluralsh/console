import { Breadcrumb, useSetBreadcrumbs } from '@pluralsh/design-system'
import { Title1H1 } from 'components/utils/typography/Text'
import { POLICIES_REL_PATH } from 'routes/policiesRoutesConsts'
import { useTheme } from 'styled-components'

const breadcrumbs: Breadcrumb[] = [
  { label: `${POLICIES_REL_PATH}`, url: `/${POLICIES_REL_PATH}` },
]

function Policies() {
  const theme = useTheme()

  useSetBreadcrumbs(breadcrumbs)

  return (
    <div
      css={{
        padding: theme.spacing.large,
        backgroundColor: theme.colors['fill-zero'],
      }}
    >
      <Title1H1>Policies</Title1H1>
    </div>
  )
}

export default Policies
