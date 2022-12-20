import { useContext, useEffect } from 'react'

import { BreadcrumbsContext } from '../../Breadcrumbs'

export default function Pods() {
  const { setBreadcrumbs } = useContext(BreadcrumbsContext)

  useEffect(() => {
    setBreadcrumbs([
      { text: 'pods', url: '/pods' },
    ])
  }, [setBreadcrumbs])

  return <div>Hello pods</div>
}
