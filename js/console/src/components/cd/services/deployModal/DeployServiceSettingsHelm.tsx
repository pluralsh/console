import { FormField, Input } from '@pluralsh/design-system'
import { isNonNullable } from 'utils/isNonNullable'

export function ChartForm({
  url,
  setUrl,
  chart,
  setChart,
  version,
  setVersion,
}: {
  url?: Nullable<string>
  setUrl: (url: string) => void
  chart: string
  setChart: (chart: string) => void
  version: string
  setVersion: (version: string) => void
}) {
  return (
    <>
      {isNonNullable(url) && (
        <FormField label="URL">
          <Input
            placeholder="Optionally specify a Helm chart repository URL"
            value={url}
            onChange={(e) => setUrl(e.target?.value)}
          />
        </FormField>
      )}
      <FormField
        required
        label="Chart Name"
      >
        <Input
          placeholder="Enter chart name"
          value={chart}
          onChange={(e) => setChart(e.target?.value)}
        />
      </FormField>
      <FormField
        required
        label="Chart Version"
      >
        <Input
          placeholder="Enter chart version"
          value={version}
          onChange={(e) => setVersion(e.target?.value)}
        />
      </FormField>
    </>
  )
}
