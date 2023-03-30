import { SubTab, TabList } from '@pluralsh/design-system'
import { Key, useEffect, useRef, useState } from 'react'

import { DURATIONS } from 'utils/time'

export default function RangePicker({ duration, setDuration }: any) {
  const tabStateRef = useRef<any>()
  const [selectedKey, setSelectedKey] = useState<Key>(
    `${duration.offset}+${duration.step}`
  )

  useEffect(() => {
    const dur = DURATIONS.find((d) => selectedKey === `${d.offset}+${d.step}`)

    if (dur) setDuration(dur)
  }, [selectedKey, setDuration])

  return (
    <TabList
      gap="xxsmall"
      stateRef={tabStateRef}
      stateProps={{
        orientation: 'horizontal',
        selectedKey,
        onSelectionChange: setSelectedKey,
      }}
    >
      {DURATIONS.map((d) => (
        <SubTab
          key={`${d.offset}+${d.step}`}
          textValue={d.label}
        >
          {d.label}
        </SubTab>
      ))}
    </TabList>
  )
}
