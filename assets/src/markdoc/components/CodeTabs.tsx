import { useMemo } from 'react'

import { CodeStyled, toCodeString } from './Fence'

function CodeTabs({ tabs, ...props }) {
  const codeTabs = useMemo(() => tabs.map(tab => {
    const {
      content, children, process, ...props
    } = tab

    return {
      ...props,
      key: props?.title || props?.language || '',
      label: props?.title || props?.language || '',
      content: toCodeString({ process, children, content }),
    }
  }), [tabs])

  return (
    <CodeStyled
      tabs={codeTabs}
      {...props}
    />
  )
}

export { CodeTabs }
