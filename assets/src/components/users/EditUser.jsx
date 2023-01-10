import { Box, Text } from 'grommet'
import { Logout } from 'forge-core'

import { wipeToken } from '../../helpers/auth'

import Avatar from './Avatar'

function EditAvatar({ me }) {
  return (
    <>
      <Avatar
        user={me}
        size="80px"
      />
      {/* <HiddenFileInput accept='.jpg, .jpeg, .png' multiple={false} /> */}
    </>
  )
}

function ActionBox({ onClick, text, icon }) {
  return (
    <Box
      pad="small"
      direction="row"
      round="3px"
      align="center"
      gap="small"
      hoverIndicator="sidebarHover"
      onClick={onClick}
    >
      <Box
        flex={false}
        direction="row"
      >
        {icon}
      </Box>
      <Box fill="horizontal">
        <Text size="small">{text}</Text>
      </Box>
    </Box>
  )
}

export default function EditUser() {
  const [editing, setEditing] = useState('User Attributes')

  return (
    <Box
      pad="small"
      background="backgroundColor"
      fill
    >
      {/* eslint-disable-next-line react/jsx-no-constructed-context-values */}
      <Box
        fill
        direction="row"
        gap="small"
      >
        <Box
          flex={false}
          gap="medium"
          width="250px"
          pad={{ vertical: 'medium' }}
        >
          <Box gap="xsmall">
            <ActionBox
              text="logout"
              onClick={() => {
                wipeToken()
                window.location = '/login'
              }}
              icon={<Logout size="12px" />}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
