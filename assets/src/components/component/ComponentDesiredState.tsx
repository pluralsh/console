import { useOutletContext } from 'react-router-dom'

import { useMemo } from 'react'

import DiffViewer from '../utils/DiffViewer'

export default function ComponentDesiredState() {
  const { component } = useOutletContext<any>()

  const [live, desired] = useMemo(
    () => [component?.content?.live ?? '', component?.content?.desired ?? ''],
    [component]
  )

  return (
    <DiffViewer
      oldValue={live}
      newValue={desired}
    />
  )
}
