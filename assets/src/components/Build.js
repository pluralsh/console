import React, { useEffect, useState, useContext, useRef } from 'react'
import { useParams, useHistory } from 'react-router-dom'
import { useQuery, useMutation } from 'react-apollo'
import { ModalHeader, Button, Loading } from 'forge-core'
import { Box, Text, Layer } from 'grommet'
import Line from 'react-lazylog/build/Line'
import { ansiparse } from './utils/ansi'
import { BUILD_Q, COMMAND_SUB, BUILD_SUB, CREATE_BUILD, CANCEL_BUILD, APPROVE_BUILD } from './graphql/builds'
import { mergeEdges } from './graphql/utils'
import moment from 'moment'
import { Checkmark, StatusCritical } from 'grommet-icons'
import { BeatLoader } from 'react-spinners'
import { BreadcrumbsContext } from './Breadcrumbs'
import './build.css'
import { BuildStatus, BuildTypes } from './types'
import { Avatar } from './EditUser'
import { groupBy } from 'lodash'
import { TabHeader, TabSelector } from './utils/TabSelector'
import { AnsiText } from './utils/AnsiText'

 const HEADER_PADDING = {horizontal: 'medium'}

function Timer({insertedAt, completedAt, status}) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (completedAt) return
    setTimeout(() => setTick(tick + 1), 1000)
  }, [completedAt, tick, setTick])

  const end = completedAt ? moment(completedAt) : moment()
  const begin = moment(insertedAt)
  const fromBeginning = (dt) =>  moment.duration(dt.diff(begin))
  const duration = fromBeginning(end)
  return (
    <pre>
      {status}{moment.utc(duration.as('milliseconds')).format('HH:mm:ss')}
    </pre>
  )
}

function buildStyles(status) {
  switch (status) {
    case BuildStatus.QUEUED:
      return {color: 'status-unknown', label: null}
    case BuildStatus.RUNNING:
      return {color: 'progress', label: null}
    case BuildStatus.CANCELLED:
      return {color: 'light-6', label: 'Cancelled, '}
    case BuildStatus.FAILED:
      return {color: 'error', label: 'Failed, '}
    case BuildStatus.SUCCESSFUL:
      return {color: 'success', label: 'Passed, '}
    case BuildStatus.PENDING:
      return {color: 'status-warning', label: 'Pending Approval '}
    default:
      return {}
  }
}

function BuildTimer({insertedAt, completedAt, status}) {
  const {color, label} = buildStyles(status)
  return (
    <OptionContainer>
      <Box flex={false} pad='xsmall' background={color}>
        <Timer
          insertedAt={insertedAt}
          completedAt={completedAt}
          status={label} />
      </Box>
    </OptionContainer>
  )
}

function OptionContainer({children, ...props}) {
  return (
    <Box flex={false} pad={HEADER_PADDING} border='left' fill='vertical' justify='center' align='center' {...props}>
      {children}
    </Box>
  )
}

function Rebuild({build: {repository, message, type}}) {
  let history = useHistory()
  const [open, setOpen] = useState(false)
  const [mutation, {loading}] = useMutation(CREATE_BUILD, {
    variables: {attributes: {repository, message, type}},
    onCompleted: ({createBuild: {id}}) => history.push(`/build/${id}`)
  })

  return (
    <>
    <OptionContainer hoverIndicator='light-3' onClick={() => setOpen(true)}>
      <Text size='small'>restart</Text>
    </OptionContainer>
    {open && (
      <Layer modal>
        <Box width='40vw'>
          <ModalHeader text='Are you sure you want to restart this build?' setOpen={setOpen} />
          <Box direction='row' justify='end' pad='medium'>
            <Button label='restart' onClick={mutation} loading={loading} />
          </Box>
        </Box>
      </Layer>
    )}
    </>
  )
}

function Cancel({build: {id}}) {
  const [open, setOpen] = useState(false)
  const [mutation, {loading}] = useMutation(CANCEL_BUILD, {variables: {id}})

  return (
    <>
    <OptionContainer hoverIndicator='light-3' onClick={() => setOpen(true)}>
      <Text size='small'>cancel</Text>
    </OptionContainer>
    {open && (
      <Layer modal>
        <Box width='40vw'>
          <ModalHeader text='Are you sure you want to cancel this build?' setOpen={setOpen} />
          <Box direction='row' justify='end' pad='medium'>
            <Button label='Cancel' onClick={mutation} loading={loading} />
          </Box>
        </Box>
      </Layer>
    )}
    </>
  )
}

function ExitStatusInner({exitCode}) {
  const success = exitCode === 0
  return (
    <Box direction='row' align='center' gap='xsmall'>
      {success ? <Checkmark color='success' size='12px' /> : <StatusCritical size='12px' />}
      {success ? <Text size='small' color='success'>OK</Text> : <Text size='small'>exit code: {exitCode}</Text>}
    </Box>
  )
}

function ExitStatus({exitCode}) {
  const background = exitCode !== 0 ? 'error' : null
  if (!exitCode && exitCode !== 0) return (
    <Box width='40px' direction='row'>
      <BeatLoader size={5} />
    </Box>
  )

  return (
    <Box pad='xsmall' background={background} align='center'>
      <ExitStatusInner exitCode={exitCode} />
    </Box>
  )
}

function LogLine({line, number}) {
  const lineRef = useRef()
  useEffect(() => {
    lineRef && lineRef.current && lineRef.current.scrollIntoView(true)
  }, [lineRef, line])

  return (
    <div ref={lineRef}>
      <Line data={ansiparse(line)} number={number} rowHeight={19} />
    </div>
  )
}

function Log({text}) {
  if (!text) return null

  const lines = text.match(/[^\r\n]+/g)
  const last = lines.length
  return (
    <div class='log'>
      {lines.map((line, ind) => <LogLine key={ind} line={line} number={ind + 1} last={last} />)}
    </div>
  )
}

function Command({command}) {
  const ref = useRef()
  const stdout = command.stdout
  useEffect(() => ref && ref.current && ref.current.scrollIntoView(), [ref])

  return (
    <Box flex={false} ref={ref}>
      <Box direction='row' gap='small' pad={{vertical: 'xxsmall', horizontal: 'medium'}}
        align='center' background='console'>
        <Box fill='horizontal' direction='row' gap='small' align='center'>
          <pre>==> {command.command}</pre>
          <ExitStatus exitCode={command.exitCode} />
        </Box>
        <Timer insertedAt={command.insertedAt} completedAt={command.completedAt} />
      </Box>
      <Log text={stdout} follow />
    </Box>
  )
}

function updateQuery(prev, {subscriptionData: {data}}) {
  if (!data) return prev
  if (data.buildDelta) {
    return {...prev, build: {...prev, ...data.buildDelta.payload}}
  }

  const {commandDelta: {delta, payload}} = data
  const {commands: {edges, ...rest}, ...build} = prev.build

  return {
    ...prev,
    build: {
      ...build,
      commands: {...rest, edges: mergeEdges(edges, delta, payload, 'CommandEdge', 'append')}
  }}
}

function Commands({edges}) {
  return (
    <Box style={{overflow: 'auto'}} background='console' fill pad={{bottom: 'small'}}>
      {edges.map(({node}) => <Command key={node.id} command={node} />)}
    </Box>
  )
}

function ChangeChoice({text, onClick, enabled}) {
  return (
    <TabSelector enabled={enabled} onClick={onClick}>
      <Text size='small' weight={500}>{text}</Text>
    </TabSelector>
  )
}

function Approval({build}) {
  const [mutation, {loading}] = useMutation(APPROVE_BUILD, {variables: {id: build.id}})
  if (build.approver) {
    return (
      <OptionContainer>
        <Text size='small'>approved by: {build.approver.name}</Text>
      </OptionContainer>
    )
  }

  if (build.status !== BuildStatus.PENDING) return null

  return (
    <OptionContainer>
      <Button label='approve' loading={loading} onClick={mutation} />
    </OptionContainer>
  )
}

const SIDEBAR_WIDTH = '120px'

function Changelog({build: {changelogs}}) {
  const {repo: initialRepo, tool: initialTool} = changelogs.length > 0 ? changelogs[0] : {}
  const [repo, setRepo] = useState(initialRepo)
  const [tool, setTool] = useState(initialTool)
  const grouped = groupBy(changelogs,  ({repo}) => repo)
  const tools = grouped[repo] || []
  const selected = tools.find(({tool: t}) => t === tool)

  return (
    <Box fill direction='row'>
      <Box flex={false} width={SIDEBAR_WIDTH} height='100%' border='right'>
        {Object.keys(grouped).map((r) => (
          <ChangeChoice key={r} text={r} enabled={repo === r} onClick={() => setRepo(r)} />
        ))}
      </Box>
      <Box flex={false} width={SIDEBAR_WIDTH} height='100%' border='right'>
        {tools.map(({tool: t}) => (
          <ChangeChoice key={t} text={t} enabled={tool === t} onClick={() => setTool(t)} />
        ))}
      </Box>
      <Box style={{overflow: 'auto'}} height='100%' fill='horizontals' background='console' pad='small'>
        {selected && (<AnsiText text={selected.content} />)}
      </Box>
    </Box>
  )
}

export default function Build() {
  const {buildId} = useParams()
  const [tab, setTab] = useState('progress')
  const {data, loading, subscribeToMore} = useQuery(BUILD_Q, {variables: {buildId}})
  const {setBreadcrumbs} = useContext(BreadcrumbsContext)

  useEffect(() => {
    setBreadcrumbs([
      {text: 'builds', url: '/'},
      {text: buildId, url: `/builds/${buildId}`}
    ])

    const first = subscribeToMore({document: COMMAND_SUB, variables: {buildId}, updateQuery})
    const second = subscribeToMore({document: BUILD_SUB, variables: {buildId}, updateQuery})
    return () => {
      first()
      second()
    }
  }, [buildId, subscribeToMore])

  if (!data || loading) return <Loading />
  const {commands: {edges}, creator, ...build} = data.build
  const hasChanges = build.changelogs && build.changelogs.length > 0
  const isPending = build.status === BuildTypes.PENDING

  return (
    <Box fill>
      <Box flex={false} direction='row' align='center' border='bottom'>
        <Box direction='row' fill='horizontal' align='center'>
          <Box fill='horizontal'>
            <Box direction='row' gap='small' pad={{left: 'small', vertical: 'small'}}>
              <Text size='small' weight='bold'>{build.repository}</Text>
              <Text size='small' color='dark-3'>{build.message}</Text>
            </Box>
            <Box direction='row'>
              <TabHeader text='progress' onClick={() => setTab('progress')} selected={tab === 'progress'} />
              {hasChanges && (
                <TabHeader text='changelog' onClick={() => setTab('changelog')} selected={tab === 'changelog'} />
              )}
            </Box>
          </Box>
          {creator && (
            <Box flex={false} pad={{right: 'medium'}} direction='row' gap='xsmall' align='center'>
              <Avatar me={creator} size='40px' />
              <Text size='small' weight={500}>{creator.name}</Text>
            </Box>
          )}
        </Box>
        <Approval build={build} />
        <BuildTimer insertedAt={build.insertedAt} completedAt={build.completedAt} status={build.status} />
        <Rebuild build={build} />
        <Cancel build={build} />
      </Box>
      {tab === 'progress' && <Commands edges={edges} />}
      {tab === 'changelog' && <Changelog build={build} />}
    </Box>
  )
}