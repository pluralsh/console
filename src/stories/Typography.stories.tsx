import { Text } from 'honorable'

export default {
  title: 'Typography',
  component: Template,
}

function Template() {
  return (
    <>
      <Text
        marginTop="medium"
        h1
      >
        H1 - Lorem ipsum dolor
      </Text>
      <Text
        marginTop="medium"
        h2
      >
        H2 - Lorem ipsum dolor
      </Text>
      <Text
        marginTop="medium"
        h3
      >
        H3 - Lorem ipsum dolor
      </Text>
      <Text
        marginTop="medium"
        h4
      >
        H4 - Lorem ipsum dolor
      </Text>
      <Text
        marginTop="medium"
        title1
      >
        Title 1 - Lorem ipsum dolor
      </Text>
      <Text
        marginTop="medium"
        title2
      >
        Title 2 - Lorem ipsum dolor
      </Text>
      <Text
        marginTop="medium"
        subtitle1
      >
        Subtitle 1 - Lorem ipsum dolor
      </Text>
      <Text
        marginTop="medium"
        subtitle2
      >
        Subtitle 2 - Lorem ipsum dolor
      </Text>
      <Text
        marginTop="medium"
        body1
        bold
      >
        Body 1 (Bold)  - Lorem ipsum dolor
      </Text>
      <Text
        marginTop="medium"
        body1
      >
        Body 1 - Lorem ipsum dolor
      </Text>
      <Text
        marginTop="medium"
        body2
        bold
      >
        Body 2 (Bold) - Lorem ipsum dolor
      </Text>
      <Text
        marginTop="medium"
        body2
      >
        Body 2 - Lorem ipsum dolor
      </Text>
      <Text
        marginTop="medium"
        caption
      >
        Caption - Lorem ipsum dolor
      </Text>
      <Text
        marginTop="medium"
        badge-label
      >
        Badge Label - Lorem ipsum dolor
      </Text>
      <Text
        marginTop="medium"
        button-large
      >
        Large Button - Lorem ipsum dolor
      </Text>
      <Text
        marginTop="medium"
        button-small
      >
        Small Button - Lorem ipsum dolor
      </Text>
      <Text
        marginTop="medium"
        overline
      >
        Overline - Lorem ipsum dolor
      </Text>
    </>
  )
}

export const Typography = Template.bind({})
