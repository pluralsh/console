import { Flex, Span } from 'honorable'

export function AuditAction({ audit: { action, type } }: any) {
  if (!action) return <span>n/a</span>

  return (
    <Flex direction="column">
      {action}
      <Span
        caption
        color="text-xlight"
      >
        {type}
      </Span>
    </Flex>
  )
}
