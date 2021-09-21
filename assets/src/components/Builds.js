import React, { useState, useEffect, useContext, useCallback } from 'react'
import { useHistory } from 'react-router-dom'
import { useQuery, useMutation } from 'react-apollo'
import { BUILDS_Q, CREATE_BUILD, BUILD_SUB } from './graphql/builds'
import { Button } from 'forge-core'
import { Box, Layer, Text } from 'grommet'
import moment from 'moment'
import { BeatLoader } from 'react-spinners'
import { BreadcrumbsContext } from './Breadcrumbs'
import { BuildIcons, BuildStatus as Status, BuildTypes } from './types'
import { InstallationContext } from './Installations'
import { appendConnection, extendConnection, updateCache } from '../utils/graphql'
import { LoopingLogo } from './utils/AnimatedLogo'
import { StandardScroller } from './utils/SmoothScroller'
import { UpgradePolicies } from './builds/UpgradePolicies'
import { Checkmark, Close, StatusCritical, Up } from 'grommet-icons'
import { ThemeContext } from 'styled-components'
import { normalizeColor } from 'grommet/utils'
import alpha from 'color-alpha'
import { RunbookList } from './runbooks/RunbookList'

function BuildStatusInner({background, text, icon}) {
  return (
    <Box
      flex={false}
      direction='row'
      align='center'
      pad={{horizontal: 'small', vertical: 'xsmall'}}
      round='xxsmall'
      background={background}>
      {icon && <Box width='50px'>{icon}</Box>}
      <Text size='small' weight={500}>{text}</Text>
    </Box>
  )
}

function IconStatus({icon, background}) {
  return (
    <Box round='full' pad='xsmall' align='center' justify='center' 
         background={background}>
      {React.createElement(icon, {size: '16px'})}
    </Box>
  )
}

export function BuildIcon({build, size}) {
  const icon = BuildIcons[build.type]
  return (
    <Box flex={false} pad='small'>
      {React.createElement(icon, {size: size || '15px'})}
    </Box>
  )
}

function BuildStatus({status}) {
  switch (status) {
    case Status.QUEUED:
      return <BuildStatusInner background='status-unknown' text='queued' />
    case Status.CANCELLED:
      return <IconStatus icon={Close} background='tone-medium' />
    case Status.RUNNING:
      return (
        <BuildStatusInner
          icon={<BeatLoader size={5} margin={2} color='white' />}
          background='progress'
          text='running' />
      )
    case Status.FAILED:
      return <IconStatus icon={StatusCritical} background='error' />
    case Status.SUCCESSFUL:
      return <IconStatus icon={Checkmark} background='success' />
    case Status.PENDING:
      return <BuildStatusInner background='status-warning' text='pending approval' />
    default:
      return null
  }
}

export const BUILD_PADDING = {horizontal: 'medium'}

export const boxShadow = (theme) => ({boxShadow: `2px 2px 2px ${alpha(normalizeColor('backgroundDark', theme), .3)}`})

function Build({build}) {
  const theme = useContext(ThemeContext)
  const {id, repository, status, insertedAt, message, creator, sha} = build
  let history = useHistory()
  const footer = [
    moment(insertedAt).fromNow(),
    creator && creator.name,
    message,
    sha
  ].filter((e) => !!e).join(' -- ')

  return (
    <Box pad={BUILD_PADDING}>
      <Box style={boxShadow(theme)}
        pad='small' margin={{top: 'small'}} direction='row' 
        background='backgroundLight' align='center' focusIndicator={false} 
        hoverIndicator='backgroundDark' round='xsmall'
        onClick={() => history.push(`/build/${id}`)} gap='small'>
        <BuildIcon build={build} />
        <Box fill='horizontal'>
          <Text size='small' weight='bold'>{repository}</Text>
          <Text size='small' color='dark-6'>{footer}</Text>
        </Box>
        <BuildStatus status={status} />
      </Box>
    </Box>
  )
}

function CreateBuild() {
  const [type, setType] = useState(BuildTypes.DEPLOY)
  const {currentApplication} = useContext(InstallationContext)
  const baseAttrs = {repository: currentApplication.name, message: 'Deployed from console'}
  const [mutation, {loading}] = useMutation(CREATE_BUILD, {
    update: (cache, {data: {createBuild}}) => updateCache(cache, {
      query: BUILDS_Q,
      update: (prev) => appendConnection(prev, createBuild, 'builds')
    })
  })

  const deploy = useCallback((type) => {
    setType(type)
    mutation({variables: {attributes: {type, ...baseAttrs}}})
  }, [setType, mutation, baseAttrs])

  return (
    <Box flex={false} gap='small' pad={{horizontal: 'small'}} direction='row' align='center'>
      <Button
        onClick={() => deploy(BuildTypes.BOUNCE)} 
        background='backgroundLight' flat
        label='Bounce'
        loading={loading && type === BuildTypes.BOUNCE} />
      <Button
        onClick={() => deploy(BuildTypes.APPROVAL)} 
        background='backgroundLight' flat
        label='Approval'
        loading={loading && type === BuildTypes.APPROVAL} />
      <Button
        onClick={() => deploy(BuildTypes.DEPLOY)}
        loading={loading && type === BuildTypes.DEPLOY} 
        label='Deploy'  background='brand' flat />
    </Box>
  )
}

const POLL_INTERVAL = 1000 * 30

function Placeholder() {
  return (
    <Box pad={BUILD_PADDING}>
      <Box height='90px' color='' background='backgroundLight' 
           margin={{top: 'small'}} round='xsmall' />
    </Box>
  )
}

function ReturnToBeginning({beginning}) {
  return (
    <Layer position='bottom-right' modal={false} plain>
      <Box direction='row' align='center' round='xsmall' gap='small' 
           hoverIndicator='cardDark' background='cardDarkLight'
           margin={{bottom: 'medium', right: 'small'}}
           pad='small' focusIndicator={false} onClick={beginning}>
        <Box direction='row' fill='horizontal' justify='center'>
          <Text size='small'>go to most recent</Text>
        </Box>
        <Up size='15px' />
      </Box>
    </Layer>
  )
}

export const HEADER_HEIGHT = '60px'

export default function Builds() {
  const [listRef, setListRef] = useState(null)
  const [scrolled, setScrolled] = useState(false)
  const {data, loading, subscribeToMore, fetchMore} = useQuery(BUILDS_Q, {
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL
  })

  const {setOnChange} = useContext(InstallationContext)
  const {setBreadcrumbs} = useContext(BreadcrumbsContext)
  useEffect(() => {
    setOnChange({func: () => null})
    setBreadcrumbs([{text: 'builds', url: '/'}])
  }, [])

  useEffect(() => subscribeToMore({
    document: BUILD_SUB,
    updateQuery: (prev, {subscriptionData: {data: {buildDelta: {delta, payload}}}}) => {
      return delta === 'CREATE' ? appendConnection(prev, payload, 'builds') : prev
  }}), [])

  const returnToBeginning = useCallback(() => {
    listRef.scrollToItem(0)
  }, [listRef])

  if (loading && !data) return <LoopingLogo scale='0.75' />

  const {edges, pageInfo} = data.builds
  return (
    <Box fill direction='row' background='backgroundColor'>
      <RunbookList width='30%' border={{side: 'right', color: 'sidebar'}} />
      <Box fill>
        <Box flex={false} pad={{vertical: 'small', ...BUILD_PADDING}}
          direction='row' align='center' height={HEADER_HEIGHT}>
          <Box fill='horizontal' pad={{horizontal: 'small'}}>
            <Text weight='bold' size='small'>Builds</Text>
            <Text size='small' color='dark-3'>a list of historical changes managed by console</Text>
          </Box>
          <UpgradePolicies />
          <CreateBuild />
        </Box>
        <Box fill pad={{bottom: 'small'}}>
          {scrolled && <ReturnToBeginning beginning={returnToBeginning} />}
          <StandardScroller
            listRef={listRef}
            setListRef={setListRef}
            items={edges}
            loading={loading}
            handleScroll={setScrolled}
            placeholder={Placeholder}
            hasNextPage={pageInfo.hasNextPage}
            mapper={({node}) => <Build key={node.id} build={node} />}
            loadNextPage={() => pageInfo.hasNextPage && fetchMore({
              variables: {cursor: pageInfo.endCursor},
              updateQuery: (prev, {fetchMoreResult: {builds}}) => extendConnection(prev, builds, 'builds')
            })} />
        </Box>
      </Box>
    </Box>
  )
}