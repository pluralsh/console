import {
  ArrowTopRightIcon,
  Breadcrumb,
  Flex,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useSetPageHeaderContent } from 'components/cd/ContinuousDeployment'
import { StackedTextSC } from 'components/utils/table/StackedText'
import { CLOUD_CONNECTIONS_SETTINGS_ABS_PATH } from 'routes/settingsRoutesConst'
import { useTheme } from 'styled-components'
import { SETTINGS_BREADCRUMBS } from '../Settings'
import {
  AddCloudConnectionButton,
  CloudConnectionsList,
} from './CloudConnectionsList'

const CLOUD_CONNECTIONS_SETTINGS_BREADCRUMBS: Breadcrumb[] = [
  ...SETTINGS_BREADCRUMBS,
  { label: 'cloud connections', url: CLOUD_CONNECTIONS_SETTINGS_ABS_PATH },
]

export default function CloudConnectionsSettings() {
  const theme = useTheme()

  useSetBreadcrumbs(CLOUD_CONNECTIONS_SETTINGS_BREADCRUMBS)
  useSetPageHeaderContent(
    <Flex justifyContent="space-between">
      <StackedTextSC>
        <span
          css={{
            ...theme.partials.text.body2,
            color: theme.colors['text-light'],
          }}
        >
          Manage all your configured cloud integrations in one place.
        </span>
      </StackedTextSC>
      <AddCloudConnectionButton
        buttonProps={{
          secondary: true,
          endIcon: <ArrowTopRightIcon />,
        }}
      />
    </Flex>
  )

  return <CloudConnectionsList />
}
