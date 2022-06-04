import { Text } from 'honorable'

export default {
  title: 'Type Scale',
  component: Template,
}

function Template() {
  return (
    <>
      <Text
        mt={1}
        h1
      >H1<br />Lorem ipsum dolor
      </Text>
      <Text
        mt={1}
        h2
      >H2<br />Lorem ipsum dolor
      </Text>
      <Text
        mt={1}
        h3
      >H3<br />Lorem ipsum dolor
      </Text>
      <Text
        mt={1}
        h4
      >H4<br />Lorem ipsum dolor
      </Text>
      <Text
        mt={1}
        title1
      >Title 1<br />Lorem ipsum dolor
      </Text>
      <Text
        mt={1}
        title2
      >Title 2<br />Lorem ipsum dolor
      </Text>
      <Text
        mt={1}
        subtitle1
      >Subtitle 1<br />Lorem ipsum dolor
      </Text>
      <Text
        mt={1}
        subtitle2
      >Subtitle 2<br />Lorem ipsum dolor
      </Text>
      <Text
        mt={1}
        body1
        bold
      >
        Body 1 (Bold)
        <br />Lorem ipsum dolor
      </Text>
      <Text
        mt={1}
        body1
      >Body 1<br />Lorem ipsum dolor
      </Text>
      <Text
        mt={1}
        body2
        bold
      >
        Body 2 (Bold)
        <br />Lorem ipsum dolor
      </Text>
      <Text
        mt={1}
        body2
      >Body 2<br />Lorem ipsum dolor
      </Text>
      <Text
        mt={1}
        caption
      >Caption<br />Lorem ipsum dolor
      </Text>
      <Text
        mt={1}
        badge-label
      >Badge Label<br />Lorem ipsum dolor
      </Text>
      <Text
        mt={1}
        button-large
      >Large Button<br />Lorem ipsum dolor
      </Text>
      <Text
        mt={1}
        button-small
      >Small Button<br />Lorem ipsum dolor
      </Text>
      <Text
        mt={1}
        overline
      >Overline<br />Lorem ipsum dolor
      </Text>
    </>
  )
}

export const All = Template.bind({})
