import { Flex } from 'honorable'
import { useTheme } from 'styled-components'

import { LogsInfoPanel } from './LogsInfoPanel'
import { ts } from './misc'

export default function LogInfo({
  stream,
  stamp,
  addLabel,
  onClose,
  marginTop = '0',
}) {
  const theme = useTheme()

  return (
    <LogsInfoPanel
      title="Log info"
      subtitle="Select an attribute below to apply a filter."
      onClose={onClose}
      marginTop={marginTop}
    >
      {[['timestamp', ts(stamp)], ...Object.entries(stream)].map(
        ([key, value]: any) => (
          <Flex
            key={key}
            direction="row"
            paddingHorizontal={theme.spacing.medium}
            paddingVertical={theme.spacing.small}
            borderBottom="1px solid border-fill-two"
            gap={theme.spacing.small}
            cursor="pointer"
            _hover={{ backgroundColor: 'fill-three' }}
            onClick={() => addLabel(key, value)}
          >
            <div
              css={{
                ...theme.partials.text.body1,
                fontWeight: 600,
                width: '120px',
              }}
            >
              {key}
            </div>
            <div
              css={{
                ...theme.partials.text.body2,
                color: theme.colors['text-light'],
                width: 300,
              }}
            >
              {value}
            </div>
          </Flex>
        )
      )}
    </LogsInfoPanel>
  )
}
