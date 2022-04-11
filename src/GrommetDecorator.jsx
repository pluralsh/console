import { Box, Grommet } from 'grommet'
import { BrowserRouter } from 'react-router-dom'

import theme from './theme'

function GrommetDecorator(Story, { title }) {
  if (title === 'Sidebar') {
    return (
      <BrowserRouter>
        <Grommet
          full
          theme={theme}
        >
          <Box
            style={{ height: '100vh' }}
            direction="row"
          >
            <Story />
          </Box>
        </Grommet>
      </BrowserRouter>
    )
  }

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
