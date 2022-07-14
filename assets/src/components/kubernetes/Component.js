import { useContext, useEffect } from 'react'
import { Box } from 'grommet'
import { useHistory, useParams } from 'react-router'

import Highlight from 'react-highlight.js'

import yaml from 'yaml'

import { BreadcrumbsContext } from '../Breadcrumbs'
import { InstallationContext, useEnsureCurrent } from '../Installations'

import { BUILD_PADDING } from '../Builds'

import Service from './Service'
import ComponentName from './ComponentName'
import Deployment from './Deployment'
import Ingress from './Ingress'
import StatefulSet from './StatefulSet'

import CronJob from './CronJob'
import Job from './Job'
import { Certificate } from './Certificate'

function ComponentContent({ namespace, kind, name }) {
  switch (kind.toLowerCase()) {
    case 'service':
      return (
        <Service
          namespace={namespace}
          kind={kind}
          name={name}
        />
      )
    case 'deployment':
      return (
        <Deployment
          namespace={namespace}
          kind={kind}
          name={name}
        />
      )
    case 'ingress':
      return (
        <Ingress
          namespace={namespace}
          kind={kind}
          name={name}
        />
      )
    case 'statefulset':
      return (
        <StatefulSet
          namespace={namespace}
          kind={kind}
          name={name}
        />
      )
    case 'cronjob':
      return (
        <CronJob
          namespace={namespace}
          kind={kind}
          name={name}
        />
      )
    case 'job':
      return (
        <Job
          namespace={namespace}
          kind={kind}
          name={name}
        />
      )
    case 'certificate':
      return (
        <Certificate
          namespace={namespace}
          kind={kind}
          name={name}
        />
      )
    default:
      return null
  }
}

export function RawContent({ raw }) {
  const obj = JSON.parse(raw)

  return (
    <Box
      flex={false}
      pad="small"
    >
      <Highlight language="yaml">
        {yaml.stringify(obj)}
      </Highlight>
    </Box>
  )
}

export default function Component() {
  const { repo, kind, name } = useParams()
  const history = useHistory()
  const { setBreadcrumbs } = useContext(BreadcrumbsContext)
  const { setOnChange, currentApplication } = useContext(InstallationContext)
  useEffect(() => {
    setBreadcrumbs([
      { text: 'components', url: '/components' },
      { text: currentApplication.name, url: `/components/${currentApplication.name}` },
      { text: kind.toLowerCase(), url: `/components/${currentApplication.name}/${kind}/${name}`, disable: true },
      { text: name, url: `/components/${currentApplication.name}/${kind}/${name}` },
    ])
  }, [currentApplication])
  useEffect(() => {
    setOnChange({ func: ({ name }) => history.push(`/components/${name}`) }) 
  }, [])
  useEnsureCurrent(repo)

  return (
    <Box
      fill
      background="backgroundColor"
    >
      <Box
        flex={false}
        pad={{ vertical: 'small', ...BUILD_PADDING }}
        direction="row"
        align="center"
        height="60px"
      >
        <ComponentName component={{ kind, name }} />
      </Box>
      <Box
        fill
        style={{ overflow: 'auto' }}
        pad={{ horizontal: 'medium' }}
        gap="xsmall"
      >
        <ComponentContent
          namespace={repo}
          kind={kind}
          name={name}
        />
      </Box>
    </Box>
  )
}
