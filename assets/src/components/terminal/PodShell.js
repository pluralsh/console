import React, { useContext, useEffect } from 'react'
import { useParams } from 'react-router'
import { BreadcrumbsContext } from '../Breadcrumbs'
import { useEnsureCurrent } from '../Installations'
import { Shell } from './Shell'

export function PodShell() {
  const {namespace, name, container} = useParams()
  const {setBreadcrumbs} = useContext(BreadcrumbsContext)

  useEffect(() => {
    setBreadcrumbs([
      {text: 'pods', url: `/components/${namespace}`, disable: true},
      {text: namespace, url: `/components/${namespace}`},
      {text: name, url: `/pods/${namespace}/${name}`},
      {text: container, url: `/shell/pod/${namespace}/${name}/${container}`}
    ])
  }, [namespace, name, container])
  useEnsureCurrent(namespace)

  return (
    <Shell 
      title={`pod / ${name} / ${container}`}
      room={`pod:${namespace}:${name}:${container}`} 
      header={`connecting to pod ${name}...`} />
  )
}