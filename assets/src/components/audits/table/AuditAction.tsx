import { Flex, Span } from 'honorable'

export function AuditAction({ audit: { action, type } }: any) {
  if (!action) return (<Span>n/a</Span>)

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
