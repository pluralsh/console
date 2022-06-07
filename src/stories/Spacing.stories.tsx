import { Div, P } from 'honorable'

export default {
  title: 'Spacing',
  component: Template,
}

function Template() {
  return [
    'xxxsmall',
    'xxsmall',
    'xsmall',
    'small',
    'medium',
    'large',
    'xlarge',
    'xxlarge',
    'xxxlarge',
    'xxxxlarge',
  ].map(key => (
    <Div
      key={key}
      marginTop="medium"
    >
      <Div
        display="inline-block"
        backgroundColor="action-primary"
        paddingTop={key}
        paddingRight={key}
      />
      <P marginTop="xsmall">{key}</P>
    </Div>
  ))
}

export const Spacing = Template.bind({})
