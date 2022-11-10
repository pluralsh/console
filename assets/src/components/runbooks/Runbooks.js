import { useContext, useEffect } from 'react'
import { Box, Text } from 'grommet'
import { useQuery } from '@apollo/react-hooks'

import { useHistory, useParams } from 'react-router'

import {
  ApplicationIcon,
  InstallationContext,
  hasIcon,
  useEnsureCurrent,
} from '../Installations'

import { BreadcrumbsContext } from '../Breadcrumbs'

import { Container } from '../utils/Container'

import { RUNBOOKS_Q } from './queries'
import { POLL_INTERVAL } from './constants'

import { StatusIcon } from './StatusIcon'

function RunbookRow({ runbook, namespace }) {
  const hist = useHistory()
  const { name, description } = runbook.spec

  return (
    <Container onClick={() => hist.push(`/runbooks/${namespace}/${runbook.name}`)}>
      <StatusIcon
        status={runbook.status}
        size={30}
        innerSize={14}
      />
      <Box
        fill="horizontal"
        gap="xsmall"
      >
        <Text
          size="small"
          weight={500}
        >{name}
        </Text>
        <Text
          size="small"
          color="dark-3"
          truncate
        >{description}
        </Text>
      </Box>
    </Container>
  )
}

export function Runbooks() {
  const history = useHistory()
  const { repo } = useParams()
  const { currentApplication, setOnChange } = useContext(InstallationContext)
  const { data } = useQuery(RUNBOOKS_Q, {
    variables: { namespace: currentApplication.name },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })

  const { setBreadcrumbs } = useContext(BreadcrumbsContext)

  useEffect(() => {
    setBreadcrumbs([
      { text: 'runbooks', url: '/runbooks' },
      { text: currentApplication.name, url: `/runbooks/${currentApplication.name}` },
    ])
  }, [currentApplication])

  useEffect(() => {
    setOnChange({ func: ({ name }) => history.push(`/runbooks/${name}`) })
  }, [])
  useEnsureCurrent(repo)

  const namespace = currentApplication.name

  return (
    <Box
      fill
      background="backgroundColor"
    >
      <Box
        flex={false}
        pad="small"
        direction="row"
        align="center"
        border={{ side: 'bottom' }}
      >
        <Box
          direction="row"
          fill="horizontal"
          gap="small"
          align="center"
        >
          {hasIcon(currentApplication) && (
            <ApplicationIcon
              application={currentApplication}
              size="40px"
              dark
            />
          )}
          <Box>
            <Text
              weight="bold"
              size="small"
            >{currentApplication.name}
            </Text>
            <Text
              size="small"
              color="dark-3"
            >a collection of runbooks to help operate this application
            </Text>
          </Box>
        </Box>
      </Box>
      <Box
        fill
        gap="xsmall"
        pad="small"
      >
        {data && data.runbooks.map(book => (
          <RunbookRow
            key={book.name}
            runbook={book}
            namespace={namespace}
          />
        ))}
      </Box>
    </Box>
  )
}
