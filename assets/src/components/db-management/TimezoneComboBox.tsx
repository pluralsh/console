import { useMemo, useState } from 'react'
import { ComboBox, ListBoxItem } from '@pluralsh/design-system'
import { memoize } from 'lodash'
import moment from 'moment-timezone'
import Fuse from 'fuse.js'

const POP_THRESHOLD = 7000000

const getTimezones = memoize(() => {
  console.log('getTimezones running')
  const all = moment.tz.names()
  const x: Record<
    string,
    {
      population: number
      name: string
      friendlyName: string
      offset: string
      numericalOffset: number
    }[]
  > = {}

  for (const zoneName of all) {
    const z = moment.tz(zoneName)
    const offset = z.format('Z')
    // @ts-ignore
    const zone = z._z
    const newZone = {
      name: zoneName,
      population:
        typeof zone.population === 'number' ? (zone.population as number) : 0,
      friendlyName: zoneName.replaceAll('_', ' ').replaceAll('/', ' – '),
      offset,
      numericalOffset: Number(z.format('ZZ')),
    }

    if (
      !x[offset] ||
      (x[offset][0].population < POP_THRESHOLD &&
        x[offset][0].population < newZone.population)
    ) {
      x[offset] = [newZone]
    } else if (
      newZone.population > POP_THRESHOLD ||
      newZone.name.startsWith('US/')
    ) {
      x[offset].push(newZone)
    }
  }

  return Object.values(x)
    .flatMap((z) => z)
    .sort((a, b) => a.numericalOffset - b.numericalOffset)
})

export function TimezoneComboBox({
  selectedTz,
  setSelectedTz,
}: {
  selectedTz: string
  setSelectedTz: (tz: string) => void
}) {
  const [comboInputTz, setComboInputTz] = useState('')
  const timezones = getTimezones()
  const fuse = useMemo(
    () =>
      new Fuse(timezones, {
        includeScore: true,
        shouldSort: true,
        threshold: 0.2,
        keys: ['friendlyName'],
      }),
    [timezones]
  )

  const searchResults = useMemo(() => {
    if (comboInputTz) {
      return fuse.search(comboInputTz)
    }

    return timezones.map(
      (item, i): Fuse.FuseResult<(typeof timezones)[number]> => ({
        item,
        score: 1,
        refIndex: i,
      })
    )
  }, [comboInputTz, fuse, timezones])

  const currentZone = timezones.find((z) => z.name === selectedTz)

  const placeholder = currentZone
    ? `${currentZone.friendlyName} (${currentZone.offset})`
    : 'Select a timezone'

  const comboBox = (
    <ComboBox
      inputValue={comboInputTz}
      onInputChange={setComboInputTz}
      selectedKey={selectedTz}
      inputProps={{ placeholder }}
      onSelectionChange={(key) => {
        setSelectedTz(key as string)
        setComboInputTz('')
      }}
    >
      {searchResults.map((zone) => (
        <ListBoxItem
          key={zone.item.name}
          label={`${zone.item.friendlyName} (${zone.item.offset})`}
        />
      ))}
    </ComboBox>
  )

  return comboBox
}
