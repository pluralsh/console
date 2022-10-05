import { CardHue } from 'src/components/Card'
import { Div } from 'honorable'

import { Callout, CalloutProps, Card } from '..'

export default {
  title: 'Callout',
  component: Callout,
  argTypes: {
    size: {
      options: ['full', 'compact'],
      control: { type: 'select' },
    },
    onCard: {
      options: ['none', 'default', 'lighter', 'lightest'],
      control: { type: 'select' },
    },
  },
}

const styles: CalloutProps['severity'][] = [
  'info',
  'success',
  'warning',
  'danger',
]

const fullContent = (
  <>
    Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
    tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam,
    quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo
    consequat.
  </>
)

const compactContent = (
  <>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do.</>
)

function Template({
  size,
  withButton,
  title,
  fillLevel,
  onCard,
}: CalloutProps & { withButton: boolean; onCard: CardHue }) {
  let Wrapper = Div

  if (onCard && onCard !== 'none') {
    Wrapper = Card
  }

  return (
    <Wrapper
      hue={onCard}
      padding={onCard && onCard !== 'none' ? 'medium' : 0}
      display="flex"
      flexDirection="column"
      gap="large"
      maxWidth={600}
    >
      {styles.map(style => (
        <Callout
          severity={style}
          size={size}
          title={title}
          fillLevel={fillLevel}
          buttonProps={withButton ? { children: 'Button text' } : undefined}
        >
          {size === 'compact' ? compactContent : fullContent}
        </Callout>
      ))}
    </Wrapper>
  )
}

export const Default = Template.bind({})
Default.args = {
  title: '',
  size: 'full',
  withButton: false,
  fillLevel: 2,
  onCard: 'none',
}

export const WithTitle = Template.bind({})
WithTitle.args = {
  title: 'Title text - How to write a dummy title',
  size: 'full',
  withButton: false,
  fillLevel: 2,
  onCard: 'none',
}

export const Compact = Template.bind({})
Compact.args = {
  title: '',
  size: 'compact',
  withButton: false,
  fillLevel: 2,
  onCard: 'none',
}

export const WithButton = Template.bind({})
WithButton.args = {
  title: '',
  size: 'full',
  withButton: true,
  fillLevel: 2,
  onCard: 'none',
}

export const KitchenSink = Template.bind({})
KitchenSink.args = {
  title: 'Title text - How to write a dummy title',
  size: 'full',
  withButton: true,
  fillLevel: 2,
  onCard: 'none',
}

export const OnCard = Template.bind({})
OnCard.args = {
  onCard: 'default',
  title: 'Title text - How to write a dummy title',
  size: 'full',
  withButton: true,
}
