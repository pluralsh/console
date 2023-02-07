import { Div, Flex } from 'honorable'

import { LogsInfoPanel } from './LogsInfoPanel'
import { ts } from './misc'

export default function LogInfo({
  stream, stamp, addLabel, onClose, marginTop = '0',
}) {
  return (
    <LogsInfoPanel
      title="Log info"
      subtitle="Select an attribute below to apply a filter."
      onClose={onClose}
      marginTop={marginTop}
    >
      {[['timestamp', ts(stamp)], ...Object.entries(stream)].map(([key, value]: any) => (
        <Flex
          key={key}
          direction="row"
          paddingHorizontal="medium"
          paddingVertical="small"
          borderBottom="1px solid border-fill-two"
          gap="small"
          cursor="pointer"
          _hover={{ backgroundColor: 'fill-three' }}
          onClick={() => addLabel(key, value)}
        >
          <Div
            body1
            fontWeight={600}
            width={120}
            wordWrap="wrap"
          >
            {key}
          </Div>
          <Div
            body2
            color="text-light"
            width={300}
            wordWrap="wrap"
          >
            {value}
          </Div>
        </Flex>
      ))}
    </LogsInfoPanel>
  )
}
