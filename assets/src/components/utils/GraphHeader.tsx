import { Div } from 'honorable'
import {
  InfoIcon,
  InfoOutlineIcon,
  Tooltip,
  WrapWithIf,
} from '@pluralsh/design-system'

export default function GraphHeader({
  title,
  tooltip,
}: {
  title: string
  tooltip?: string
}) {
  return (
    <Div
      color="text-light"
      justifyContent="center"
      overline
      textAlign="center"
    >
      <WrapWithIf
        condition={!!tooltip}
        wrapper={<Tooltip label={tooltip} />}
      >
        <span>
          {title}
          {!!tooltip && (
            <InfoOutlineIcon
              size={14}
              css={{
                verticalAlign: 'text-top',
                marginLeft: '4px',
              }}
            />
          )}
        </span>
      </WrapWithIf>
    </Div>
  )
}
