import React, { useState, useEffect, useContext } from 'react'
import { useHistory } from 'react-router-dom'
import { useQuery, useMutation } from 'react-apollo'
import { BUILDS_Q, CREATE_BUILD, BUILD_SUB } from './graphql/builds'
import { Loading, Button, Scroller, ModalHeader } from 'forge-core'
import { Box, Text, FormField, TextInput, Select, Layer } from 'grommet'
import moment from 'moment'
import { mergeEdges } from './graphql/utils'
import { BeatLoader } from 'react-spinners'
import { BreadcrumbsContext } from './Breadcrumbs'
import { BuildStatus as Status, BuildTypes } from './types'
import { InstallationContext } from './Installations'

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
  const [open, setOpen] = useState(false)
  return (
    <>
    <Box pad={{horizontal: 'small'}}>
      <Button
        onClick={() => setOpen(true)} label='Create' 
        round='xsmall' background='brand' flat
        pad={{horizontal: 'medium', vertical: 'xsmall'}} />
    </Box>
    {open && (
      <Layer modal>
        <Box width='40vw'>
          <ModalHeader text='Create a build' setOpen={setOpen} />
          <BuildForm setOpen={setOpen} />
        </Box>
      </Layer>
    )}
    </>
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
    updateQuery: (prev, {subscriptionData: {data}}) => {
      return data ? applyDelta(prev, data.buildDelta) : prev
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