import React, { useState, useEffect, useContext, useCallback } from 'react'
import { useHistory } from 'react-router-dom'
import { useQuery, useMutation } from 'react-apollo'
import { BUILDS_Q, CREATE_BUILD, BUILD_SUB } from './graphql/builds'
import { Loading, Button, Scroller, SecondaryButton } from 'forge-core'
import { Box, Text, FormField, TextInput, Select } from 'grommet'
import moment from 'moment'
import { mergeEdges } from './graphql/utils'
import { BeatLoader } from 'react-spinners'
import { BreadcrumbsContext } from './Breadcrumbs'
import { BuildStatus as Status, BuildTypes } from './types'
import { InstallationContext } from './Installations'
import { appendConnection, updateCache } from '../utils/graphql'

function BuildStatusInner({background, text, icon}) {
  return (
    <Box
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

function BuildForm({setOpen}) {
  const {applications} = useContext(InstallationContext)
  const [attributes, setAttributes] = useState({repository: applications[0].name, type: 'DEPLOY', message: "manual test"})
  const [mutation, {loading}] = useMutation(CREATE_BUILD, {
    variables: {attributes},
    fetchPolicy: 'no-cache',
    onCompleted: () => setOpen(false)
  })

  return (
    <Box gap='small' pad='medium'>
      <FormField label='repository'>
        <Select
          options={applications.map(({name}) => name)}
          value={attributes.repository}
          onChange={({value}) => setAttributes({...attributes, repository: value})} />
      </FormField>
      <FormField label='message'>
        <TextInput
          placeholder='manual test'
          value={attributes.message}
          onChange={({target: {value}}) => setAttributes({...attributes, message: value})} />
      </FormField>
      <FormField label='type'>
        <Select
          options={Object.keys(BuildTypes).map((type) => ({type, display: type.toLowerCase()}))}
          value={attributes.type}
          labelKey='display'
          valueKey={{key: 'type', reduce: true}}
          onChange={({value}) => setAttributes({...attributes, type: value})}>
          {({display}) => <Box pad='small'><Text size='small'>{display}</Text></Box>}
        </Select>
      </FormField>
      <Box direction='row' justify='end' align='center'>
        <Button loading={loading} label='Create' round='xsmall' onClick={mutation} />
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
      <SecondaryButton 
        onClick={() => deploy(BuildTypes.APPROVAL)} 
        hoverIndicator='sidebar'
        background='backgroundColor'
        border={{color: 'sidebar'}}
        elevation={null}
        label='Approval'
        icon={loading && type === BuildTypes.APPROVAL && <BeatLoader color='white' size={8} />} />
      <Button
        onClick={() => deploy(BuildTypes.DEPLOY)}
        loading={loading && type === BuildTypes.DEPLOY} 
        label='Deploy'  background='brand' flat />
    </Box>
  )
}

function applyDelta({builds: {edges, ...rest}, ...prev}, {delta, payload}) {
  return {
    ...prev,
    builds: {...rest, edges: mergeEdges(edges, delta, payload, "BuildEdge")}
  }
}

const POLL_INTERVAL = 1000 * 10

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
              updateQuery: (prev, {fetchMoreResult: {builds}}) => {
                return {...prev, builds: {
                  ...prev.builds, pageInfo: builds.pageInfo, edges: [...edges, ...builds.edges]
                }}
              }
            })} />
        </Box>
      </Box>
    </Box>
  )
}