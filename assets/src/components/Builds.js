import React, { useState, useEffect, useContext, useCallback } from 'react'
import { useHistory } from 'react-router-dom'
import { useQuery, useMutation } from 'react-apollo'
import { BUILDS_Q, CREATE_BUILD, BUILD_SUB } from './graphql/builds'
import { Loading, Button, Scroller } from 'forge-core'
import { Box, Text } from 'grommet'
import moment from 'moment'
import { BeatLoader } from 'react-spinners'
import { BreadcrumbsContext } from './Breadcrumbs'
import { BuildStatus as Status, BuildTypes } from './types'
import { InstallationContext } from './Installations'
import { appendConnection, extendConnection, updateCache } from '../utils/graphql'

function BuildStatusInner({background, text, icon}) {
  return (
    <Box
      flex={false}
      direction='row'
      align='center'
      pad={{horizontal: 'small', vertical: 'xsmall'}}
      round='xsmall'
      background={background}>
      {icon && <Box width='50px'>{icon}</Box>}
      <Text size='small'>{text}</Text>
    </Box>
  )
}

function BuildStatus({status}) {
  switch (status) {
    case Status.QUEUED:
      return <BuildStatusInner background='status-unknown' text='queued' />
    case Status.CANCELLED:
      return <BuildStatusInner background='light-6' text='cancelled' />
    case Status.RUNNING:
      return (
        <BuildStatusInner
          icon={<BeatLoader size={5} margin={2} color='white' />}
          background='progress'
          text='running' />
      )
    case Status.FAILED:
      return <BuildStatusInner background='error' text='failed' />
    case Status.SUCCESSFUL:
      return <BuildStatusInner background='success' text='successful' />
    case Status.PENDING:
      return <BuildStatusInner background='status-warning' text='pending approval' />
    default:
      return null
  }
}

export const BUILD_PADDING = {horizontal: 'medium'}

function Build({build: {id, repository, status, insertedAt, message, creator, sha}}) {
  let history = useHistory()
  const footer = [
    moment(insertedAt).fromNow(),
    creator && creator.name,
    message,
    sha
  ].filter((e) => !!e).join(' -- ')

  return (
    <Box pad={BUILD_PADDING}>
      <Box pad='small' margin={{top: 'small'}} direction='row' background='backgroundLight'
        align='center' focusIndicator={false} hoverIndicator='backgroundDark' round='xsmall'
        onClick={() => history.push(`/build/${id}`)}>
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
  const baseAttrs = {repository: currentApplication.name, message: 'Deployed from watchman'}
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

export default function Builds() {
  const {data, loading, subscribeToMore, fetchMore} = useQuery(BUILDS_Q, {
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL
  })
  const {setOnChange} = useContext(InstallationContext)
  const {setBreadcrumbs} = useContext(BreadcrumbsContext)
  useEffect(() => setBreadcrumbs([{text: 'builds', url: '/'}]), [])
  useEffect(() => subscribeToMore({
    document: BUILD_SUB,
    updateQuery: (prev, {subscriptionData: {data: {delta, payload}}}) => {
      return delta === 'CREATE' ? appendConnection(prev, payload, 'builds') : prev
  }}), [])

  useEffect(() => {
    setOnChange({func: () => null})
  }, [])

  if (loading && !data) return <Loading />

  const {edges, pageInfo} = data.builds
  return (
    <Box height='calc(100vh - 45px)'>
      <Box>
        <Box
          pad={{vertical: 'small', ...BUILD_PADDING}}
          direction='row'
          align='center'
          border='bottom'
          background='backgroundColor'
          height='60px'>
          <Box fill='horizontal' pad={{horizontal: 'small'}}>
            <Text weight='bold' size='small'>Builds</Text>
            <Text size='small' color='dark-3'>a list of historical changes managed by watchman</Text>
          </Box>
          <CreateBuild />
        </Box>
        <Box height='calc(100vh - 105px)' background='backgroundColor' pad={{bottom: 'small'}}>
          <Scroller
            id='builds'
            style={{height: '100%', overflow: 'auto'}}
            edges={edges}
            mapper={({node}) => <Build key={node.id} build={node} />}
            onLoadMore={() => pageInfo.hasNextPage && fetchMore({
              variables: {cursor: pageInfo.endCursor},
              updateQuery: (prev, {fetchMoreResult: {builds}}) => extendConnection(prev, builds, 'builds')
            })} />
        </Box>
      </Box>
    </Box>
  )
}