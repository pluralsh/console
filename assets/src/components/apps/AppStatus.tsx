import { Readiness, appState } from 'components/Application'
import { Chip } from 'pluralsh-design-system'

export default function AppStatus({ application }) { // TODO: Verify statuses.
  const { readiness } = appState(application)

  switch (readiness) {
  case Readiness.Ready:
    return (
      <Chip
        size="small"
        severity="success"
      >
        Ready
      </Chip>
    )
  case Readiness.Complete:
    return (
      <Chip
        size="small"
        severity="success"
      >
        Complete
      </Chip>
    )
  case Readiness.Failed:
    return (
      <Chip
        size="small"
        severity="error"
      >
        Failed
      </Chip>
    )
  case Readiness.InProgress:
    return (
      <Chip
        size="small"
        severity="warning"
      >
        Pending
      </Chip>
    )
  default:
    return <Chip size="small">Unknown</Chip>
  }
}

// export function ReadyIcon({ size, readiness, showIcon }) {
//   const theme = useContext(ThemeContext)
//   let color = 'error'
//   let icon = <StatusCritical size="small" />
//   let anim = null
//   let defaultSize = '20px'

//   switch (readiness) {
//   case Readiness.InProgress:
//     color = 'orange-dark'
//     anim = PulsyDiv
//     icon = null
//     defaultSize = '16px'
//     break
//   default:
//     break
//   }

//   return (
//     <Box
//       flex={false}
//       as={anim}
//       width={size || defaultSize}
//       height={size || defaultSize}
//       round="full"
//       align="center"
//       justify="center"
//       background={color}
//       style={{ boxShadow: `0 0 10px ${normalizeColor(color, theme)}` }}
//     >
//       {showIcon && icon}
//     </Box>
//   )
// }
