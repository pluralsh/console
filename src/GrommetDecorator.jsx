import { Grommet } from 'grommet'

import theme from './theme'

function GrommetDecorator(Story) {
  return (
    <Grommet
      full
      theme={theme}
    >
      <div style={{ padding: 24 }}>
        <Story />
      </div>
    </Grommet>
  )
}

export default GrommetDecorator
