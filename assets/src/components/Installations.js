import React, { useEffect, useContext, useState, useCallback } from 'react'
import { Box, Text, ThemeContext, Layer, Anchor, TextInput } from 'grommet'
import { Checkmark, CircleInformation } from 'grommet-icons'
import { Links, Divider, Tabs, TabContent, TabHeader, TabHeaderItem, Explore as Search } from 'forge-core'
import { useQuery } from 'react-apollo'
import { APPLICATIONS_Q, APPLICATION_SUB } from './graphql/plural'
import { ApplicationReadyIcon } from './Application'
import { LoopingLogo } from './utils/AnimatedLogo'
import { CostBreakdown } from './repos/CostAnalysis'
import { FlyoutContainer, Icon } from './Console'
import { ModalHeader } from './utils/Modal'
import { chunk } from 'lodash'
import { OIDCProvider } from './oidc/OIDCProvider'

export const InstallationContext = React.createContext({})

function Installation({application, setCurrentApplication, current: {name}}) {
  const {name: appname, spec: {descriptor}} = application
  return (
    <Box direction='row' align='center' gap='small' pad='small' focusIndicator={false}
         onClick={() => setCurrentApplication(application)} hoverIndicator='hover'>
      <ApplicationReadyIcon application={application} showIcon dark />
      {descriptor.icons.length > 0 && <ApplicationIcon application={application} size='40px' dark />}
      <Box fill='horizontal'>
        <Box direction='row' align='center' gap='xsmall'>
          <Text size='small' weight={500}>{appname}</Text>
          <Box round='xsmall' background='card' pad={{horizontal: '3px', vertical: '2px'}}>
            <Text size='12px'>{descriptor.version}</Text>
          </Box>
        </Box>
        <Text size='small' color='dark-3'>{descriptor.description}</Text>
      </Box>
      <Box pad='small' flex={false}>
        {name === appname ? <Checkmark size='18px' color='brand' /> : null}
      </Box>
    </Box>
  )
}

export function ApplicationIcon({application: {spec: {descriptor: {icons}}}, size}) {
  const {dark} = useContext(ThemeContext)
  return <img alt='' src={(dark && icons[1]) ? icons[1] : icons[0]} width={size || '25px'} height={size || '25px'} />
}

export const hasIcon = ({spec: {descriptor: {icons}}}) => icons.length > 0

export function InstallationsFlyout() {
  const {applications, setCurrentApplication, currentApplication, setOpen} = useContext(InstallationContext)
  const [q, setQ] = useState(null)

  return (
    <FlyoutContainer header='Applications' close={() => setOpen(false)}>
      <Box flex={false}>
        <Box fill='horizontal'>
          <TextInput 
            plain
            icon={<Search size='15px' />}
            value={q || ''}
            placeholder='search for an application'
            onChange={({target: {value}}) => setQ(value)} />
        </Box>
        {applications
        .filter((application) => !q || application.name.startsWith(q))
        .map((application) => (
          <Installation
            key={application.name}
            application={application}
            current={currentApplication}
            setCurrentApplication={setCurrentApplication} />
        ))}
      </Box>
    </FlyoutContainer>
  )
}

export function ToolbarItem({children, onClick, open}) {
  return (
    <Box flex={false} direction='row' round='xsmall' background={open ? 'sidebarHover' : null}
         margin={{vertical: 'xsmall'}} pad={{horizontal: 'small', vertical: 'xsmall'}} 
         gap='small' align='center'  hoverIndicator='sidebarHover' onClick={onClick}>
      {children}
    </Box>
  )
}

function ApplicationLink({link: {url, description}, width}) {
  return (
    <Box direction='row' align='center' round='xsmall' 
         background='tone-light' gap='small' pad='small' width={width || '33%'}>
      <Links size='15px' />
      <Box>
        <Anchor target='_blank' size='small' href={`https://${url}`}>{url}</Anchor>
        <Text size='small' color='dark-3'>{description}</Text>
      </Box>
    </Box>
  )
}

export function ApplicationDetails() {
  const {currentApplication} = useContext(InstallationContext)
  const {name, spec: {descriptor}, cost, license} = currentApplication
  const hasLinks = descriptor.links
  const hasCost = cost || license

  return (
    <Box fill pad='medium' gap='small'>
      <Box direction='row' gap='small' align='center'>
        {descriptor.icons.length > 0 && <ApplicationIcon size='40px' application={currentApplication} />}
        <Box fill='horizontal'>
          <Box direction='row' align='center' gap='xsmall'>
            <Text size='small' weight={500}>{name}</Text>
            <Box round='xsmall' background='tone-light' pad={{horizontal: '3px', vertical: '2px'}}>
              <Text size='12px'>{descriptor.version}</Text>
            </Box>
          </Box>
          <Text size='small' color='dark-3'>{descriptor.description}</Text>
        </Box>
      </Box>
      <Tabs defaultTab={hasLinks ? 'links' : (hasCost ? 'cost' : 'oidc')}>
        <TabHeader>
          {hasLinks && (
            <TabHeaderItem name='links'>
              <Text size='small' weight={500}>Application Links</Text>
            </TabHeaderItem>
          )}
          {hasCost && (
            <TabHeaderItem name='cost'>
              <Text size='small' weight={500}>Cost Analysis</Text>
            </TabHeaderItem>
          )}
          <TabHeaderItem name='oidc'>
            <Text size='small' weight={500}>OpenID Connect</Text>
          </TabHeaderItem>
        </TabHeader>
        {hasLinks && (
          <TabContent name='links'>
            <Box gap='small' pad='small'>
              {chunk(descriptor.links, 3).map((chunk) => (
                <Box direction='row' gap='small'>
                  {chunk.map((link) => <ApplicationLink link={link} key={link.url} />)}
                </Box>
              ))}
            </Box>
          </TabContent>
        )}
        {hasCost && (
          <TabContent name='cost'>
            <CostBreakdown cost={cost} license={license} />
          </TabContent>
        )}
        <TabContent name='oidc'>
          <OIDCProvider name={name} />
        </TabContent>
      </Tabs>
    </Box>
  )
}

function ApplicationDetail({close}) {
  const {currentApplication} = useContext(InstallationContext)

  return (
    <Layer modal onEsc={close} onClickOutside={close}>
      <Box width='50vw'>
        <ModalHeader text={`${currentApplication.name} details`} setOpen={close} />
        <ApplicationDetails />
      </Box>
    </Layer>
  )
}

export function Installations() {
  const [modal, setModal] = useState(false)
  const {currentApplication, open, setOpen} = useContext(InstallationContext)
  if (!currentApplication) return null
  const {name, spec: {descriptor}} = currentApplication

  return (
    <>
    <Box flex={false} direction='row' gap='xsmall' align='center'>
      <Icon
        icon={<CircleInformation size='18px' />}
        text='Application Details'
        size='40px'
        selected={modal}
        align={{top: 'bottom'}}
        onClick={() => setModal(true)} />
      <ToolbarItem onClick={() => setOpen(true)} open={open}>
        {descriptor.icons.length > 0 && <ApplicationIcon application={currentApplication} dark />}
        <Text size='small' weight={500}>{name}</Text>
        <ApplicationReadyIcon application={currentApplication} showIcon />
      </ToolbarItem>
    </Box>
    {modal && <ApplicationDetail close={() => setModal(false)} />}
    {open && <InstallationsFlyout />}
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
        <LoopingLogo dark />
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