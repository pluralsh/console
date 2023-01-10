import { Box, Stack } from 'grommet'
import { Flex, P } from 'honorable'
import {
  AppIcon,
  Button,
  ContentCard,
  PageTitle,
  ValidatedInput,
} from '@pluralsh/design-system'
import { useContext, useState } from 'react'
// import { useFilePicker } from 'react-sage'

import { UPDATE_USER } from 'components/graphql/users'

import { LoginContext } from 'components/contexts'
import { useMutation } from 'react-apollo'

function Attribute({ header, children }: any) {
  return (
    <Box
      gap="small"
      basis="1/2"
    >
      <P fontWeight="bold">{header}</P>
      <Box
        direction="row"
        gap="small"
        align="end"
      >
        {children}
      </Box>
    </Box>
  )
}

export function Profile() {
  // TODO: const { files, onClick, HiddenFileInput } = useFilePicker({})
  const { me } = useContext<any>(LoginContext)
  const [name, setName] = useState(me.name)
  const [email, setEmail] = useState(me.email)
  const [avatar, setAvatar] = useState(me.avatar)
  const [avatarFile, setAvatarFile] = useState<any>()
  const [mutation, { loading }] = useMutation(UPDATE_USER, {
    variables: { attributes: { name, email, avatar: avatarFile } },
  })

  // useEffect(() => {
  //   if (files && files.length > 0) {
  //     setAvatar(URL.createObjectURL(files[0]))
  //     setAvatarFile(files[0])
  //   }
  // }, [files])

  return (
    <Box fill>
      <PageTitle heading="Profile" />
      <ContentCard overflowY="auto">
        <Box
          gap="large"
          margin={{ bottom: 'medium' }}
          direction="row"
        >
          <Attribute header="Profile picture">
            <Stack
              anchor="bottom-right"
              style={{ height: '96px', width: '96px' }}
            >
              <AppIcon
                name={name}
                url={avatar}
                spacing="none"
                size="medium"
              />
            </Stack>
            <Box gap="xsmall">
              <Button
                small
                secondary
                // onClick={onClick}
              >
                {avatar ? 'Switch' : 'Upload'}
              </Button>
              {!!avatar && (
                <Button
                  small
                  destructive
                  onClick={() => {
                    setAvatar(null)
                    setAvatarFile(null)
                  }}
                >
                  Delete
                </Button>
              )}
            </Box>
            {/* <HiddenFileInput
              accept=".jpg, .jpeg, .png"
              multiple={false}
            /> */}
          </Attribute>
        </Box>
        <Box gap="small">
          <ValidatedInput
            label="Full name"
            width="100%"
            value={name}
            onChange={({ target: { value } }) => setName(value)}
          />
          <ValidatedInput
            label="Email address"
            width="100%"
            value={email}
            onChange={({ target: { value } }) => setEmail(value)}
          />
        </Box>
        <Flex
          justifyContent="flex-end"
          marginTop="small"
        >
          <Button
            onClick={() => mutation()}
            loading={loading}
          >
            Save
          </Button>
        </Flex>
      </ContentCard>
    </Box>
  )
}
