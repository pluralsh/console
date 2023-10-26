import {
  ArrowLeftIcon,
  ArrowRightIcon,
  Breadcrumbs,
  IconFrame,
} from '@pluralsh/design-system'
import { useNavigate } from 'react-router-dom'

import { useTheme } from 'styled-components'

export default function Subheader() {
  const theme = useTheme()
  const navigate = useNavigate()

  return (
    <div
      css={{
        display: 'flex',
        alignItems: 'center',
        backgroundColor: theme.colors?.grey[950],
        borderBottom: '1px solid border',
        minHeight: 48,
        paddingLeft: theme.spacing.large,
        paddingRight: theme.spacing.large,
        gap: theme.spacing.large,
      }}
    >
      <div css={{ display: 'flex', gap: theme.spacing.small }}>
        <IconFrame
          clickable
          size="small"
          icon={<ArrowLeftIcon />}
          onClick={() => navigate(-1)}
          textValue="Back"
          type="floating"
        />
        <IconFrame
          clickable
          size="small"
          icon={<ArrowRightIcon />}
          onClick={() => navigate(1)}
          textValue="Forward"
          type="floating"
        />
      </div>
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'left',
          justifyContent: 'left',
          overflow: 'hidden',
          flexGrow: 1,
        }}
      >
        <Breadcrumbs
          css={{
            paddingTop: theme.spacing.small,
            paddingBottom: theme.spacing.small,
          }}
        />
      </div>
    </div>
  )
}
