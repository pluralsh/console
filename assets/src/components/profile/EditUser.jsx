import { useContext, useEffect, useState } from 'react'
import { Box, Text } from 'grommet'
import {
  Button,
  Expander,
  InputCollection,
  ResponsiveInput,
} from 'forge-core'

import { useMutation } from 'react-apollo'

import { LoginContext } from '../contexts'
import { BreadcrumbsContext } from '../Breadcrumbs'
import { UPDATE_USER } from '../graphql/users'

export function Avatar({
  me, size, round, textSize, ...rest
}) {
  return (
    <Box
      align="center"
      justify="center"
      width={size}
      height={size}
      background={me.backgroundColor}
      pad="small"
      round={round || 'xsmall'}
      {...rest}
    >
      <Text size={textSize || 'small'}>
        {me.name.substring(0, 1)}
      </Text>
    </Box>
  )
}

export default function EditUser() {
  const { me } = useContext(LoginContext)
  const { setBreadcrumbs } = useContext(BreadcrumbsContext)
  const [password, setPassword] = useState('')

  useEffect(() => setBreadcrumbs([{ text: 'me', url: '/me/edit' }]), [])
  const mergedAttributes = { password }
  const [mutation, { loading }] = useMutation(UPDATE_USER, { variables: { attributes: mergedAttributes } })

  return (
    <Box pad="small">
      <Box direction="row">
        <Box
          width="40%"
          pad="medium"
        >
          <Box
            direction="row"
            align="center"
            gap="medium"
          >
            <Avatar
              me={me}
              size="80px"
            />
            <Box>
              <Text>{me.name}</Text>
              <Text size="small">{me.email}</Text>
            </Box>
          </Box>
        </Box>
        <Box width="60%">
          <Box
            elevation="xsmall"
            border={{ color: 'light-3' }}
          >
            <Box pad="small">
              <Text
                weight="bold"
                size="small"
              >Edit {me.name}
              </Text>
            </Box>
            <Expander text="password">
              <Box pad="small">
                <InputCollection>
                  <ResponsiveInput
                    value={password}
                    label="password"
                    type="password"
                    onChange={({ target: { value } }) => setPassword(value)}
                  />
                </InputCollection>
                <Box
                  direction="row"
                  justify="end"
                >
                  <Button
                    loading={loading}
                    onClick={mutation}
                    label="Update"
                  />
                </Box>
              </Box>
            </Expander>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
