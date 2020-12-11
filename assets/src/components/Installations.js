import { Box, Drop, Text } from 'grommet'
import React, { useEffect, useRef, useContext, useState, useCallback } from 'react'
import { Checkmark } from 'grommet-icons'
import { Loading } from 'forge-core'
import { useQuery } from 'react-apollo'
import { APPLICATIONS_Q, APPLICATION_SUB } from './graphql/forge'
import { ApplicationReadyIcon } from './Application'

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
        <Text size='small' weight={500}>{appname}</Text>
        <Text size='small'>v{descriptor.version} -- {descriptor.description}</Text>
      </Box>
      <Box pad='small' flex={false}>
        {name === appname ? <Checkmark size='18px' color='brand' /> : null}
      </Box>
    </Box>
  )
}

export function ApplicationIcon({application: {spec: {descriptor: {icons}}}, size}) {
  return <img alt='' src={icons[0]} width={size || '25px'} height={size || '25px'} />
}

export const hasIcon = ({spec: {descriptor: {icons}}}) => icons.length > 0

export function Installations() {
  const ref = useRef()
  const [open, setOpen] = useState(false)
  const {applications, currentApplication, setCurrentApplication} = useContext(InstallationContext)
  if (!currentApplication) return null
  const {name, spec: {descriptor}} = currentApplication
  return (
    <>
    <Box flex={false} ref={ref} direction='row' gap='small' align='center' hoverIndicator='sidebarHover'
         onClick={() => setOpen(true)}>
      {descriptor.icons.length > 0 && <ApplicationIcon application={currentApplication} />}
      <Text size='small' weight={500}>{name}</Text>
      <ApplicationReadyIcon application={currentApplication} size='20px' showIcon />
    </Box>
    {open && (
      <Drop target={ref.current} align={{top: 'bottom'}} onClickOutside={() => setOpen(false)}>
        <Box width='400px' pad='xsmall'>
          {applications.map((application) => (
            <Installation
              key={application.name}
              application={application}
              current={currentApplication}
              setCurrentApplication={setCurrentApplication} />
          ))}
        </Box>
      </Drop>
    )}
    </>
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
  const [currentApplication, setCurrentApplication] = useState(null)
  const [{func: onChange}, setOnChange] = useState({func: () => null})
  const {data, subscribeToMore} = useQuery(APPLICATIONS_Q)
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
        <Loading />
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
        setOnChange
      }}
    >
      {children}
    </InstallationContext.Provider>
  )
}