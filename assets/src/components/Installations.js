import React, { useEffect, useContext, useState, useCallback } from 'react'
import { Box, Text } from 'grommet'
import { Checkmark, Next } from 'grommet-icons'
import { useQuery } from 'react-apollo'
import { APPLICATIONS_Q, APPLICATION_SUB } from './graphql/forge'
import { ApplicationReadyIcon } from './Application'
import { LoopingLogo } from './utils/AnimatedLogo'

export const InstallationContext = React.createContext({})

function Installation({application, setCurrentApplication, current: {name}}) {
  const {name: appname, spec: {descriptor}} = application
  return (
    <Box
      direction='row' align='center' gap='small' pad='small' round='xsmall' focusIndicator={false}
      onClick={() => setCurrentApplication(application)} hoverIndicator='light-3'>
      <ApplicationReadyIcon application={application} size='20px' showIcon />
      {descriptor.icons.length > 0 && <ApplicationIcon application={application} size='40px' />}
      <Box fill='horizontal'>
        <Box direction='row' align='center' gap='xsmall'>
          <Text size='small' weight={500}>{appname}</Text>
          <Box round='xsmall' background='light-3' pad={{horizontal: '3px', vertical: '2px'}}>
            <Text size='12px'>{descriptor.version}</Text>
          </Box>
        </Box>
        <Text size='small'>{descriptor.description}</Text>
      </Box>
      <Box pad='small' flex={false}>
        {name === appname ? <Checkmark size='18px' color='brand' /> : null}
      </Box>
    </Box>
  )
}

export function ApplicationIcon({application: {spec: {descriptor: {icons}}}, size, dark}) {
  return <img alt='' src={(dark && icons[1]) ? icons[1] : icons[0]} width={size || '25px'} height={size || '25px'} />
}

export const hasIcon = ({spec: {descriptor: {icons}}}) => icons.length > 0

export function InstallationsFlyout() {
  const {applications, setCurrentApplication, currentApplication, open, setOpen} = useContext(InstallationContext)

  if (!open) return null

  return (
    <Box flex={false} width='400px' fill='vertical'>
      <Box flex={false} pad={{horizontal: 'small', vertical: 'xsmall'}} align='center'
           direction='row' border={{side: 'bottom', color: 'light-5'}}>
        <Box fill='horizontal'>
          <Text size='small' weight={500}>Applications</Text>
        </Box>
        <Box flex={false} pad='xsmall' round='xsmall' hoverIndicator='light-3' onClick={() => setOpen(false)}>
          <Next size='14px' />
        </Box>
      </Box>
      <Box fill style={{overflow: 'auto'}}>
        <Box flex={false}>
          {applications.map((application) => (
            <Installation
              key={application.name}
              application={application}
              current={currentApplication}
              setCurrentApplication={setCurrentApplication} />
          ))}
        </Box>
      </Box>
    </Box>
  )
}

export function Installations() {
  const {currentApplication, open, setOpen} = useContext(InstallationContext)
  if (!currentApplication) return null
  const {name, spec: {descriptor}} = currentApplication
  return (
    <Box flex={false} direction='row' round='xsmall' background={open ? 'sidebarHover' : null}
         margin={{vertical: 'xsmall'}} pad={{horizontal: 'small'}} 
         gap='small' align='center'  hoverIndicator='sidebarHover' onClick={() => setOpen(true)}>
      {descriptor.icons.length > 0 && <ApplicationIcon application={currentApplication} dark />}
      <Text size='small' weight={500}>{name}</Text>
      <ApplicationReadyIcon application={currentApplication} size='20px' showIcon />
    </Box>
  )
}

export function useEnsureCurrent(repo) {
  const {applications, currentApplication, setCurrentUnsafe} = useContext(InstallationContext)
  useEffect(() => {
    const desired = applications.find(({name}) => name === repo)
    if (desired && currentApplication.name !== desired.name) {
      setCurrentUnsafe(desired)
    }
  }, [repo, applications, currentApplication])
}

function applyDelta(prev, {delta, payload}) {
  switch (delta) {
    case "CREATE":
      return {...prev, applications: [...prev.applications, payload]}
    case "DELETE":
      return {...prev, applications: prev.applications.filter(({name}) => name !== payload.name)}
    default:
      return {...prev, applications: prev.applications.map((app) => app.name === payload.name ? payload : app)}
  }
}

export function InstallationsProvider({children}) {
  const [open, setOpen] = useState(false)
  const [currentApplication, setCurrentApplication] = useState(null)
  const [{func: onChange}, setOnChange] = useState({func: () => null})
  const {data, subscribeToMore} = useQuery(APPLICATIONS_Q, {pollInterval: 120_000})
  const wrapped = useCallback((application) => {
    setCurrentApplication(application)
    application && onChange(application)
  }, [onChange, setCurrentApplication])

  useEffect(() => {
    if (!currentApplication && data && data.applications) {
      setCurrentApplication(data.applications[0])
    }
  }, [data, currentApplication, setCurrentApplication])
  useEffect(() => subscribeToMore({
    document: APPLICATION_SUB,
    updateQuery: (prev, {subscriptionData: {data}}) => {
      return data ? applyDelta(prev, data.applicationDelta) : prev
  }}), [])

  if (!currentApplication) {
    return (
      <Box width='100vw' height='100vh'>
        <LoopingLogo />
      </Box>
    )
  }
  const current = currentApplication && data && data.applications.find(({name}) => name === currentApplication.name)

  return (
    <InstallationContext.Provider
      value={{
        currentApplication: current,
        setCurrentApplication: wrapped,
        setCurrentUnsafe: setCurrentApplication,
        applications: data && data.applications,
        onChange,
        setOnChange,
        open,
        setOpen
      }}
    >
      {children}
    </InstallationContext.Provider>
  )
}