import { Card, CloseIcon } from '@pluralsh/design-system'
import { Layer } from 'grommet'
import { Div, Flex, Span } from 'honorable'

export function LogsInfoPanel({
  title, subtitle, onClose = _ => {}, contentHeight = 300, children, marginTop = '0',
}) {
  return (
    <Layer
      plain
      onClickOutside={onClose}
      position="top-right"
      margin={{ top: marginTop }}
    >
      <Card
        fillLevel={2}
        width={420}
        overflow="hidden"
        margin="large"
      >
        <Div
          height={80}
          padding="medium"
          borderBottom="1px solid border-fill-two"
        >
          <Flex justify="space-between">
            <Span
              fontSize={18}
              fontWeight={500}
              lineHeight="24px"
            >
              {title}
            </Span>
            <CloseIcon
              cursor="pointer"
              onClick={e => onClose(e)}
            />
          </Flex>
          <Div
            body2
            color="text-xlight"
          >
            {subtitle}
          </Div>
        </Div>
        <Div
          overflowY="auto"
          height={contentHeight}
        >
          {children}
        </Div>
      </Card>
    </Layer>
  )
}
