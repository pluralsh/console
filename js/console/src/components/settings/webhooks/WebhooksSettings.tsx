import {
  ArrowTopRightIcon,
  Breadcrumb,
  Flex,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useSetPageHeaderContent } from 'components/cd/ContinuousDeployment'
import { WEBHOOKS_SETTINGS_ABS_PATH } from 'routes/settingsRoutesConst'
import { useTheme } from 'styled-components'

import { SETTINGS_BREADCRUMBS } from '../Settings'
import { CreateWebhookButton, WebhooksList } from './WebhooksList'
import { StackedTextSC } from '../../utils/table/StackedText'

const WEBHOOKS_SETTINGS_BREADCRUMBS: Breadcrumb[] = [
  ...SETTINGS_BREADCRUMBS,
  { label: 'webhooks', url: WEBHOOKS_SETTINGS_ABS_PATH },
]

export default function WebhooksSettings() {
  const theme = useTheme()

  useSetBreadcrumbs(WEBHOOKS_SETTINGS_BREADCRUMBS)
  useSetPageHeaderContent(
    <Flex justifyContent="space-between">
      <StackedTextSC>
        <span
          css={{
            ...theme.partials.text.body2,
            color: theme.colors['text-light'],
          }}
        >
          Manage all your webhook integrations and settings here. Utilize them
          within workbenches to set up chatbots.
        </span>
      </StackedTextSC>
      <CreateWebhookButton
        buttonProps={{
          secondary: true,
          endIcon: <ArrowTopRightIcon />,
        }}
      />
    </Flex>
  )

  return <WebhooksList />
}
