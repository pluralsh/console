import { Card } from '@pluralsh/design-system'
import { Div, WithOutsideClick } from 'honorable'

export function LogsInfoPanel({
  title, subtitle, onOutsideClick, contentHeight = 300, children,
}) {
  return (
    <WithOutsideClick onOutsideClick={onOutsideClick}>
      <Card
        fillLevel={2}
        width={420}
        overflow="hidden"
        position="absolute"
        top={40}
        right={0}
        marginTop="small"
        zIndex={1000}
      >
        <Div
          height={80}
          padding="medium"
          borderBottom="1px solid border-fill-two"
        >
          <Div
            fontSize={18}
            fontWeight={500}
            lineHeight="24px"
          >
            {title}
          </Div>
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
    </WithOutsideClick>
  )
}
