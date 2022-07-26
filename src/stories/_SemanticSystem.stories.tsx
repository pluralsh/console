import {
  Div, Flex, Text, useTheme,
} from 'honorable'

import Divider from '../components/Divider'

export default {
  title: 'Semantic System',
  component: null,
}

function Template({ exampleText }: { exampleText?: string }) {
  return (
    <>
      <Divider
        text="Colors"
        marginVertical="xxlarge"
      />
      <Colors />
      <Divider
        text="Shadows"
        marginVertical="xxlarge"
      />
      <Shadows />
      <Divider
        text="Border radiuses"
        marginVertical="xxlarge"
      />
      <BoxRadiuses />
      <Divider
        text="Spacing"
        marginVertical="xxlarge"
      />
      <Spacing />
      <Divider
        text="Typography"
        marginVertical="xxlarge"
      />
      <Typography exampleText={exampleText} />
    </>
  )
}

function Colors() {
  const theme = useTheme()

  const colors = { ...theme.colors }

  delete colors.blue
  delete colors.grey
  delete colors.green
  delete colors.yellow
  delete colors.red

  return (
    <Flex wrap="wrap">
      {Object.entries(colors).map(([key, value]) => (
        <Flex
          direction="column"
          align="center"
          marginBottom="large"
          marginRight="large"
          width={64}
          key={key}
        >
          <Div
            width={64}
            height={64}
            backgroundColor={value}
            boxShadow="moderate"
          />
          <Text caption>
            {key}
          </Text>
        </Flex>
      ))}
    </Flex>
  )
}

function Shadows() {
  return (
    <>
      {[
        'slight',
        'moderate',
        'modal',
      ].map(key => (
        <Div
          key={key}
          marginBottom="large"
        >
          <Div
            width={64}
            height={64}
            backgroundColor="fill-one"
            boxShadow={key}
          />
          <Text
            caption
            marginTop="xsmall"
          >{key}
          </Text>
        </Div>
      ))}
    </>
  )
}

function BoxRadiuses() {
  return (
    <>
      {[
        'medium',
        'large',
      ].map(key => (
        <Div
          key={key}
          marginBottom="large"
        >
          <Div
            width={64}
            height={64}
            backgroundColor="fill-one"
            borderRadius={key}
          />
          <Text
            caption
            marginTop="xsmall"
          >{key}
          </Text>
        </Div>
      ))}
    </>
  )
}

function Spacing() {
  return (
    <>
      {[
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
          marginBottom="large"
        >
          <Div
            display="inline-block"
            backgroundColor="action-primary"
            paddingTop={key}
            paddingRight={key}
          />
          <Text
            caption
            marginTop="xsmall"
          >{key}
          </Text>
        </Div>
      ))}
    </>
  )
}

function Typography({
  exampleText = 'Lorem ipsum dolor sit amet',
}: {
  exampleText: string
}) {
  return (
    <>
      <Text
        h1
        marginBottom="large"
      >
        H1 - {exampleText}
      </Text>
      <Text
        h2
        marginBottom="large"
      >
        H2 - {exampleText}
      </Text>
      <Text
        h3
        marginBottom="large"
      >
        H3 - {exampleText}
      </Text>
      <Text
        h4
        marginBottom="large"
      >
        H4 - {exampleText}
      </Text>
      <Text
        title1
        marginBottom="large"
      >
        Title 1 - {exampleText}
      </Text>
      <Text
        title2
        marginBottom="large"
      >
        Title 2 - {exampleText}
      </Text>
      <Text
        subtitle1
        marginBottom="large"
      >
        Subtitle 1 - {exampleText}
      </Text>
      <Text
        subtitle2
        marginBottom="large"
      >
        Subtitle 2 - {exampleText}
      </Text>
      <Text
        body1
        marginBottom="medium"
        bold
      >
        Body 1 (Bold) - {exampleText}
      </Text>
      <Text
        body1
        marginBottom="large"
      >
        Body 1 - {exampleText}
      </Text>
      <Text
        body2
        marginBottom="medium"
        bold
      >
        Body 2 (Bold) - {exampleText}
      </Text>
      <Text
        body2
        marginBottom="large"
      >
        Body 2 - {exampleText}
      </Text>
      <Text
        caption
        marginBottom="large"
      >
        Caption - {exampleText}
      </Text>
      <Text
        badge-label
        marginBottom="large"
      >
        Badge Label - {exampleText}
      </Text>
      <Text
        button-large
        marginBottom="large"
      >
        Large Button - {exampleText}
      </Text>
      <Text
        button-small
        marginBottom="large"
      >
        Small Button - {exampleText}
      </Text>
      <Text
        overline
        marginBottom="large"
      >
        Overline - {exampleText}
      </Text>
    </>
  )
}

export const SemanticSystem = Template.bind({})
SemanticSystem.args = {
  exampleText: 'Lorem ipsum dolor sit amet',
}
