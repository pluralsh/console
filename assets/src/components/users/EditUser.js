import React, { useContext, useState } from 'react'
import { Box, Text, ThemeContext } from 'grommet'
import { Logout, StatusCritical, Checkmark, User, Lock } from 'grommet-icons'
import { Button, InputCollection, ResponsiveInput } from 'forge-core'
import { useMutation } from 'react-apollo'
import { EDIT_USER } from './queries'
import { LoginContext } from './EnsureLogin'
import Avatar from './Avatar'
import { wipeToken } from '../../helpers/auth'

const EditContext = React.createContext({})

function EditAvatar({me}) {
  return (
    <>
      <Avatar user={me} size='80px' onClick={onClick} />
      {/* <HiddenFileInput accept='.jpg, .jpeg, .png' multiple={false} /> */}
    </>
  )
}

function ActionBox({onClick, text, icon}) {
  return (
    <Box pad={{vertical: 'xsmall', horizontal: 'small'}} background='white' direction='row' round='xsmall'
         border={{color: 'light-4', side: 'all'}} align='center'
         justify='end' hoverIndicator='light-3' onClick={onClick}>
      <Box fill='horizontal' align='center'>
        <Text size='small' weight={500}>{text}</Text>
      </Box>
      <Box width='50px' direction='row' justify='end'>
        {icon}
      </Box>
    </Box>
  )
}

function EditSelect({edit, icon}) {
  const {editing, setEditing} = useContext(EditContext)
  return (
    <Box pad={{horizontal: 'small', vertical: 'xsmall'}} round='xsmall'
         border={{color: edit === editing ? 'brand' : 'light-5'}} fill='horizontal'
         align='center' gap='small' direction='row' hoverIndicator='light-2'
         focusIndicator={false} onClick={edit === editing ? null : () => setEditing(edit)}>
      <Box fill='horizontal'>
        {edit}
      </Box>
      <Box flex={false}>
        {icon}
      </Box>
    </Box>
  )
}

function EditContent({edit, children}) {
  const {editing} = useContext(EditContext)
  if (editing !== edit) return null

  return (
    <Box pad={{horizontal: 'small'}} fill>
      <Box fill='horizontal' direction='row' justify='center' margin={{bottom: 'small'}}>
        <Text size='small' weight={500}>{edit}</Text>
      </Box>
      {children}
    </Box>
  )
}

function passwordValid(password, confirm) {
  if (password === '') return {disabled: true, reason: 'please enter a password'}
  if (password !== confirm) return {disabled: true, reason: 'passwords must match'}
  if (password.length < 12) return {disabled: true, reason: 'passwords must be more than 12 characters'}
  return {disabled: false, reason: 'passwords match!'}
}

export default function EditUser() {
  const {silo: {background}} = useContext(ThemeContext)
  const {me} = useContext(LoginContext)
  const [attributes, setAttributes] = useState({name: me.name, email: me.email})
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [editing, setEditing] = useState('User Attributes')
  const mergedAttributes = password && password.length > 0 ? {...attributes, password} : attributes
  const [mutation, {loading}] = useMutation(EDIT_USER, {variables: {attributes: mergedAttributes}})
  const {disabled, reason} = passwordValid(password, confirm)
  const color = disabled ? 'status-error' : 'status-ok'

  return (
    <Box style={background} pad='medium' background='backgroundColor' fill>
      <Box fill gap='small' border={{color: 'light-3'}} background='white' pad='medium'>
        <Box direction='row' align='center' gap='medium' pad='medium'>
          <EditAvatar me={me} />
          <Box flex={false}>
            <Text>{attributes.name}</Text>
            <Text size='small'>{attributes.email}</Text>
          </Box>
          <Box fill direction='row' align='center' justify='end'>
            <ActionBox
              text='logout'
              onClick={() => {
                wipeToken()
                window.location = '/login'
              }}
              icon={<Logout size='12px' />} />
          </Box>
        </Box>
        <EditContext.Provider value={{editing, setEditing}}>
        <Box fill direction='row' border='between' gap='small'>
          <Box gap='small' width='25%' pad={{horizontal: 'small', vertical: 'medium'}}>
            <EditSelect edit='User Attributes' icon={<User size='small' />} />
            <EditSelect edit='Password' icon={<Lock size='small' />} />
          </Box>
          <Box width='75%'>
            <EditContent edit='User Attributes'>
              <InputCollection>
                <ResponsiveInput
                  value={attributes.name}
                  label='name'
                  onChange={({target: {value}}) => setAttributes({...attributes, name: value})} />
                <ResponsiveInput
                  value={attributes.email}
                  label='email'
                  onChange={({target: {value}}) => setAttributes({...attributes, email: value})} />
              </InputCollection>
              <Box direction='row' justify='end'>
                <Button loading={loading} onClick={mutation} flex={false} label='Update' />
              </Box>
            </EditContent>
            <EditContent edit='Password'>
              <InputCollection>
                <ResponsiveInput
                  value={password}
                  label='password'
                  type='password'
                  onChange={({target: {value}}) => setPassword(value)} />
                <ResponsiveInput
                  value={confirm}
                  label='confirm'
                  type='password'
                  onChange={({target: {value}}) => setConfirm(value)} />
              </InputCollection>
              <Box direction='row' justify='end' align='center'>
                <Box fill='horizontal' align='center' direction='row' gap='small'>
                  {disabled ?
                    <StatusCritical size='15px' color={color} /> :
                    <Checkmark size='15px' color={color} />}
                  <Text size='small' color={color}>
                    {reason}
                  </Text>
                </Box>
                <Button
                  disabled={disabled}
                  loading={loading}
                  onClick={mutation}
                  label='Update' />
              </Box>
            </EditContent>
          </Box>
        </Box>
        </EditContext.Provider>
      </Box>
    </Box>
  )
}