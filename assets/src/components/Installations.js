import React, {
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import {
  Box,
  Layer,
  Text,
  ThemeContext,
} from 'grommet'
import { CircleInformation } from 'grommet-icons'
import {
  TabContent,
  TabHeader,
  TabHeaderItem,
  Tabs,
} from 'forge-core'
import { useQuery } from 'react-apollo'

import { APPLICATIONS_Q, APPLICATION_SUB } from './graphql/plural'
import { ApplicationReadyIcon } from './Application'
import { LoopingLogo } from './utils/AnimatedLogo'
import { CostBreakdown } from './repos/CostAnalysis'
import { Icon } from './Console'
import { OIDCProvider } from './oidc/OIDCProvider'

export const InstallationContext = React.createContext({})

export function ApplicationIcon({ application: { spec: { descriptor: { icons } } }, size }) {
  const { dark } = useContext(ThemeContext)

  return (
    <img
      alt=""
      src={(dark && icons[1]) ? icons[1] : icons[0]}
      width={size || '25px'}
      height={size || '25px'}
    />
  )
}

export const hasIcon = ({ spec: { descriptor: { icons } } }) => icons.length > 0

export function ToolbarItem({ children, onClick, open }) {
  return (
    <Box
      flex={false}
      direction="row"
      round="xsmall"
      background={open ? 'sidebarHover' : null}
      margin={{ vertical: 'xsmall' }}
      pad={{ horizontal: 'small', vertical: 'xsmall' }}
      gap="small"
      align="center"
      hoverIndicator="sidebarHover"
      onClick={onClick}
    >
      {children}
    </Box>
  )
}

export function ApplicationDetails() {
  const { currentApplication } = useContext(InstallationContext)
  const { name, cost, license } = currentApplication
  const hasCost = cost || license

  return (
    <Box
      fill
      pad="medium"
      gap="small"
    >
      <Tabs defaultTab={hasCost ? 'cost' : 'oidc'}>
        <TabHeader>
          {hasCost && (
            <TabHeaderItem name="cost">
              <Text
                size="small"
                weight={500}
              >Cost Analysis
              </Text>
            </TabHeaderItem>
          )}
          <TabHeaderItem name="oidc">
            <Text
              size="small"
              weight={500}
            >OpenID Connect
            </Text>
          </TabHeaderItem>
        </TabHeader>
        {hasCost && (
          <TabContent name="cost">
            <CostBreakdown
              cost={cost}
              license={license}
            />
          </TabContent>
        )}
        <TabContent name="oidc">
          <OIDCProvider name={name} />
        </TabContent>
      </Tabs>
    </Box>
  )
}

function ApplicationDetail({ close }) {
  return (
    <Layer
      modal
      onEsc={close}
      onClickOutside={close}
    >
      <Box width="50vw">
        <ApplicationDetails />
      </Box>
    </Layer>
  )
}

export function Installations() {
  const [modal, setModal] = useState(false)
  const { currentApplication, open, setOpen } = useContext(InstallationContext)

  if (!currentApplication) return null
  const { name, spec: { descriptor } } = currentApplication

  return (
    <>
      <Box
        flex={false}
        direction="row"
        gap="xsmall"
        align="center"
      >
        <Icon
          icon={<CircleInformation size="18px" />}
          text="Application Details"
          size="40px"
          selected={modal}
          align={{ top: 'bottom' }}
          onClick={() => setModal(true)}
        />
        <ToolbarItem
          onClick={() => setOpen(true)}
          open={open}
        >
          {descriptor.icons.length > 0 && (
            <ApplicationIcon
              application={currentApplication}
              dark
            />
          )}
          <Text
            size="small"
            weight={500}
          >{name}
          </Text>
          <ApplicationReadyIcon
            application={currentApplication}
            showIcon
          />
        </ToolbarItem>
      </Box>
      {modal && <ApplicationDetail close={() => setModal(false)} />}
    </>
  )
}

export function useEnsureCurrent(repo) {
  const { applications, currentApplication, setCurrentUnsafe } = useContext(InstallationContext)

  useEffect(() => {
    const desired = applications.find(({ name }) => name === repo)

    if (desired && currentApplication.name !== desired.name) {
      setCurrentUnsafe(desired)
    }
  }, [repo, applications, currentApplication])
}

function applyDelta(prev, { delta, payload }) {
  switch (delta) {
  case 'CREATE':
    return { ...prev, applications: [...prev.applications, payload] }
  case 'DELETE':
    return { ...prev, applications: prev.applications.filter(({ name }) => name !== payload.name) }
  default:
    return { ...prev, applications: prev.applications.map(app => (app.name === payload.name ? payload : app)) }
  }
}

export function InstallationsProvider({ children }) {
  const [open, setOpen] = useState(false)
  const [currentApplication, setCurrentApplication] = useState(null)
  const [{ func: onChange }, setOnChange] = useState({ func: () => null })
  const { data, subscribeToMore } = useQuery(APPLICATIONS_Q, { pollInterval: 120_000 })
  const wrapped = useCallback(application => {
    sessionStorage.setItem('currentApplication', application.name)
    setCurrentApplication(application)
    if (application) onChange(application)
  }, [onChange, setCurrentApplication])

  useEffect(() => {
    if (!currentApplication && data && data.applications) {
      setCurrentApplication(data.applications[0])
    }
  }, [data, currentApplication, setCurrentApplication])
  useEffect(() => subscribeToMore({
    document: APPLICATION_SUB,
    updateQuery: (prev, { subscriptionData: { data } }) => (data ? applyDelta(prev, data.applicationDelta) : prev),
  }), [])

  if (!currentApplication) {
    return (
      <Box
        width="100vw"
        height="100vh"
      >
        <LoopingLogo dark />
      </Box>
    )
  }
  const lastSessionApplication = data && data.applications.find(({ name }) => name === sessionStorage.getItem('currentApplication'))
  const current = lastSessionApplication || currentApplication && data && data.applications.find(({ name }) => name === currentApplication.name)

  return (
    <InstallationContext.Provider
      // eslint-disable-next-line react/jsx-no-constructed-context-values
      value={{
        currentApplication: current,
        setCurrentApplication: wrapped,
        setCurrentUnsafe: setCurrentApplication,
        applications: data && data.applications,
        onChange,
        setOnChange,
        open,
        setOpen,
      }}
    >
      {children}
    </InstallationContext.Provider>
  )
}
