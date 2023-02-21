import { ReactElement, useEffect } from 'react'
import { Layer } from 'grommet'
import { timeout } from 'workbox-core/_private'
import { LoopingLogo } from '@pluralsh/design-system'

function DownloadConfig({ onClose }): ReactElement {
  useEffect(() => {
    timeout(2000).then(onClose)
  }, [onClose])

  return (
    <Layer background="transparent">
      <LoopingLogo />
    </Layer>
  )
}

export { DownloadConfig }
