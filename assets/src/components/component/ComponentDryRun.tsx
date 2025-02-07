import { useOutletContext } from 'react-router-dom'
import { useMemo } from 'react'
import { isEmpty } from 'lodash'

import DiffViewer from '../utils/DiffViewer'
import { ComponentDetailsContext } from './ComponentDetails'

export default function ComponentDryRun() {
  const { component } = useOutletContext<ComponentDetailsContext>()

  const [live, desired] = useMemo(
    () => [component?.content?.live ?? '', component?.content?.desired ?? ''],
    [component]
  )

  return isEmpty(live) && isEmpty(desired) ? (
    <div>There is no data available yet.</div>
  ) : (
    <DiffViewer
      oldValue={live}
      newValue={desired}
    />
  )
}
