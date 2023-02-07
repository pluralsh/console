import { Chip } from '@pluralsh/design-system'

export default function WebhookHealth({ health }) {
  const lowerCase = health?.toLowerCase()

  return (
    <Chip
      severity={lowerCase === 'healthy' ? 'success' : 'warning'}
      textTransform="capitalize"
    >
      {lowerCase}
    </Chip>
  )
}
