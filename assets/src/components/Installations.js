import { Box, Drop, Text } from 'grommet'
import React, { useEffect, useRef, useContext, useState, useCallback } from 'react'
import { Checkmark } from 'grommet-icons'
import { Loading } from 'forge-core'
import { useQuery } from 'react-apollo'
import { INSTALLATION_Q } from './graphql/forge'

export const InstallationContext = React.createContext({})

function Installation({installation, setCurrentInstallation, current: {id}}) {
  const {repository: {name, icon, description}} = installation
  return (
    <Box
      direction='row' align='center' gap='small' pad='small' round='xsmall' focusIndicator={false}
      onClick={() => setCurrentInstallation(installation)} hoverIndicator='light-3'>
      {icon && <img alt='' src={icon} width='40px' height='40px' />}
      <Box fill='horizontal'>
        <Text size='small' weight={500}>{name}</Text>
        <Text size='small'>{description}</Text>
      </Box>
      <Box pad='small' flex={false}>
        {id === installation.id ? <Checkmark size='18px' color='brand' /> : null}
      </Box>
    </Box>
  )
}

export function Installations() {
  const ref = useRef()
  const [open, setOpen] = useState(false)
  const {installations, currentInstallation, setCurrentInstallation} = useContext(InstallationContext)
  if (!currentInstallation) return null
  const {repository: {name, icon}} = currentInstallation
  return (
    <>
    <Box flex={false} ref={ref} direction='row' gap='xsmall' align='center' hoverIndicator='sidebarHover'
         onClick={() => setOpen(true)}>
      {icon && <img alt='' src={icon} width='25px' height='25px' />}
      <Text size='small' weight={500}>{name}</Text>
    </Box>
    {open && (
      <Drop target={ref.current} align={{top: 'bottom'}} onClickOutside={() => setOpen(false)}>
        <Box width='400px' pad='xsmall'>
          {installations.map(({node: installation}) => (
            <Installation
              key={installation.id}
              installation={installation}
              current={currentInstallation}
              setCurrentInstallation={setCurrentInstallation} />
          ))}
        </Box>
      </Drop>
    )}
    </>
  )
}

export function useEnsureCurrent(repo) {
  const {installations, currentInstallation, setCurrentUnsafe} = useContext(InstallationContext)
  useEffect(() => {
    const desired = installations.find(({node: {repository: {name}}}) => name === repo)
    if (desired && currentInstallation.id !== desired.node.id) {
      setCurrentUnsafe(desired.node)
    }
  }, [repo, installations, currentInstallation])
}

export function InstallationsProvider({children}) {
  const [currentInstallation, setCurrentInstallation] = useState(null)
  const [{func: onChange}, setOnChange] = useState({func: () => null})
  const {data, fetchMore} = useQuery(INSTALLATION_Q)
  const wrappedSetInstallation = useCallback((installation) => {
    setCurrentInstallation(installation)
    installation && onChange(installation)
  }, [onChange, setCurrentInstallation])

  useEffect(() => {
    if (!currentInstallation && data && data.installations) {
      setCurrentInstallation(data.installations.edges[0].node)
    }
  }, [data, currentInstallation, setCurrentInstallation])

  if (!currentInstallation) {
    return (
      <Box width='100vw' height='100vh'>
        <Loading />
      </Box>
    )
  }

  return (
    <InstallationContext.Provider
      value={{
        currentInstallation,
        setCurrentInstallation: wrappedSetInstallation,
        setCurrentUnsafe: setCurrentInstallation,
        installations: data && data.installations.edges,
        fetchMore,
        onChange,
        setOnChange
      }}
    >
      {children}
    </InstallationContext.Provider>
  )
}