import { Div, Flex, Span } from 'honorable'
import { formatLocation } from 'utils/geo'

export function AuditLocation({ ip, city, country }: any) {
  if (!ip) return (<Span>n/a</Span>)

  return (
    <Flex direction="column">
      {country && (<Div>{formatLocation(country, city)}</Div>)}
      <Span
        caption
        color="text-xlight"
      >
        {ip}
      </Span>
    </Flex>
  )
}
