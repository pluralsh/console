import styled, { useTheme } from 'styled-components'
import { partition } from 'lodash-es'

import { Flex } from 'honorable'

import Divider from '../components/Divider'

import { FlexWrap } from './FlexWrap'
import { FilledBox } from './FilledBox'
import { ItemLabel } from './ItemLabel'

const ColorBox = styled(FilledBox)<{ $colorKey: string | number }>(
  ({ theme, $colorKey }) => ({
    boxShadow: theme.boxShadows.moderate,
    backgroundColor: (theme.colors as any)[$colorKey],
  })
)

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ColorBoxWrap = styled.div((_) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  width: '64px',
}))

export function Colors({
  title,
  colors,
}: {
  title: string
  colors: [string | number, string][]
}) {
  return (
    <div>
      <Divider
        text={title}
        marginBottom="large"
      />
      <FlexWrap>
        {colors.map(([key]) => (
          <ColorBoxWrap key={key}>
            <ColorBox $colorKey={key} />
            <ItemLabel>{key}</ItemLabel>
          </ColorBoxWrap>
        ))}
      </FlexWrap>
    </div>
  )
}

function Template() {
  const theme = useTheme()
  const colors = { ...theme.colors }

  const colorEntries = Object.entries(colors).filter(
    (x): x is [(typeof x)[0], string] => typeof x[1] === 'string'
  )
  const [fills, rest1] = partition(colorEntries, (key) =>
    `${key}`.startsWith('fill')
  )
  const [borders, rest2] = partition(rest1, (key) =>
    `${key}`.startsWith('border')
  )
  const [text, rest3] = partition(rest2, (key) => `${key}`.startsWith('text'))
  const [icons, rest4] = partition(rest3, (key) => `${key}`.startsWith('icon'))
  const [codeBlock, rest5] = partition(rest4, (key) =>
    `${key}`.startsWith('code-block')
  )
  const [cloudShell, rest6] = partition(rest5, (key) =>
    `${key}`.startsWith('cloud-shell')
  )
  const [action, rest7] = partition(rest6, (key) =>
    `${key}`.startsWith('action')
  )

  const misc = rest7

  return (
    <Flex
      direction="column"
      gap="xxlarge"
    >
      <Colors
        title="Fills"
        colors={fills}
      />
      <Colors
        title="Borders"
        colors={borders}
      />
      <Colors
        title="Text"
        colors={text}
      />
      <Colors
        title="Icons"
        colors={icons}
      />
      <Colors
        title="Action"
        colors={action}
      />
      <Colors
        title="Miscellaneous"
        colors={misc}
      />
      <Colors
        title="Code block"
        colors={codeBlock}
      />
      <Colors
        title="Cloud shell"
        colors={cloudShell}
      />
    </Flex>
  )
}

const Exp = Template.bind({})

Exp.args = {}
export default Exp
