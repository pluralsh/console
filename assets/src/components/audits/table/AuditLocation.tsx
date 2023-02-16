import { Flex, Span } from 'honorable'
import { formatLocation } from 'utils/geo'

export function AuditLocation({ ip, city, country }: any) {
  if (!ip) return (<span>n/a</span>)

  return (
    <Flex direction="column">
      {country && (<div>{formatLocation(country, city)}</div>)}
      <Span
        caption
        color="text-xlight"
      >
        {ip}
      </Span>
    </Flex>
  )
}
