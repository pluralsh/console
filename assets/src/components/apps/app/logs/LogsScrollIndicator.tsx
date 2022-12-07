import { Box } from 'grommet'
import { Up } from 'grommet-icons'

function IndicatorContainer({ children, ...props }) {
  return (
    <Box
      direction="row"
      gap="xsmall"
      background="sidebar"
      align="center"
      margin={{ left: 'small', bottom: 'small' }}
      {...props}
      round="xxsmall"
      pad={{ horizontal: 'small', vertical: '3px' }}
    >
      {children}
    </Box>
  )
}

// TODO: Refactor before using in app.
export default function LogsScrollIndicator({ live, returnToTop }) {
  if (live) {
    return (
      <IndicatorContainer>
        <Box
          round="full"
          background="status-ok"
          height="10px"
          width="10px"
        />
        Live
      </IndicatorContainer>
    )
  }

  return (
    <IndicatorContainer
      onClick={returnToTop}
      hoverIndicator="sidebarHover"
    >
      return to top
      <Up size="small" />
    </IndicatorContainer>
  )
}
