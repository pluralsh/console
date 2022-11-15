import {
  Div,
  Flex,
  H1,
  Text,
} from 'honorable'

import { FillLevel, FillLevelProvider } from '../components/contexts/FillLevelContext'

import {
  Card,
  IconFrame,
  IconFrameProps,
  TrashCanIcon,
  WrapWithIf,
} from '../index'

export default {
  title: 'Icon Frame',
  component: IconFrame,
}

const fillLevels: FillLevel[] = [0, 1, 2, 3]

const sizes: IconFrameProps['size'][] = [
  'xsmall',
  'small',
  'medium',
  'large',
  'xlarge',
]

function Template({
  clickable,
  icon,
  textValue,
  tooltip,
  tooltipProps,
  ...props
}: Partial<IconFrameProps>) {
  return fillLevels.map(fillLevel => (
    <Div key={fillLevel}>
      <H1
        caption
        marginBottom="xxsmall"
      >
        On fillLevel={`{${fillLevel}}`}
      </H1>
      <Flex
        gap="xsmall"
        marginBottom="xlarge"
        alignItems="center"
        flexWrap="wrap"
      >
        {sizes.map(size => (
          <Card
            key={size}
            display="flex"
            width="max-content"
            paddingVertical="xsmall"
            paddingHorizontal="medium"
            flexDirection="row"
            alignItems="center"
            gap="medium"
            fillLevel={fillLevel}
            {...(fillLevel === 0 ? { backgroundColor: 'transparent' } : {})}
          >
            <WrapWithIf
              condition={fillLevel === 0}
              wrapper={<FillLevelProvider value={fillLevel} />}
            >
              <Text caption>size="{size}"</Text>
              <IconFrame
                size={size || 'medium'}
                clickable={clickable === undefined ? true : clickable}
                icon={icon || <TrashCanIcon />}
                textValue={textValue || 'Delete'}
                tooltip={tooltip}
                tooltipProps={tooltipProps}
                {...props}
              />
            </WrapWithIf>
          </Card>
        ))}
      </Flex>
    </Div>
  ))
}

export const Default = Template.bind({})
Default.args = {
  clickable: true,
  tooltip: true,
  tooltipProps: {
    displayOn: 'hover',
    placement: 'top',
  },
  textValue: 'Delete',
}
