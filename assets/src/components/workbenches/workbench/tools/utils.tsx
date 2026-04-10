import {
  DatadogLogoIcon,
  GrafanaLogoIcon,
  SentryLogoIcon,
  ToolsIcon,
} from '@pluralsh/design-system'

import { WorkbenchToolType } from 'generated/graphql'

export function getToolIcon(toolType: Nullable<WorkbenchToolType>) {
  switch (toolType) {
    case WorkbenchToolType.Datadog:
      return <DatadogLogoIcon fullColor />
    case WorkbenchToolType.Prometheus:
      return <GrafanaLogoIcon fullColor />
    case WorkbenchToolType.Grafana:
      return <GrafanaLogoIcon fullColor />
    case WorkbenchToolType.Sentry:
      return <SentryLogoIcon />
    case WorkbenchToolType.Http:
    case WorkbenchToolType.Elastic:
    case WorkbenchToolType.Loki:
    case WorkbenchToolType.Tempo:
    case WorkbenchToolType.Mcp:
    default:
      return <ToolsIcon />
  }
}
