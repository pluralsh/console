import { Box } from 'grommet'
import { useParams } from 'react-router-dom'

import Highlight from 'react-highlight.js'

import yaml from 'yaml'

import Deployment from './Deployment'
import Ingress from './Ingress'
import StatefulSet from './StatefulSet'

import CronJob from './CronJob'
import Job from './Job'
import { Certificate } from './Certificate'

function ComponentContent({ namespace, kind, name }) {
  switch (kind.toLowerCase()) {
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

  return (
    <ComponentContent
      namespace={repo}
      kind={kind}
      name={name}
    />
  )
}
