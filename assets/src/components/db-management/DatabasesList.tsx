import { Div, Flex } from 'honorable'
import { createColumnHelper } from '@tanstack/react-table'
import {
  ComponentProps,
  FormEvent,
  MouseEvent,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { cpuParser, memoryFormat, memoryParser } from 'utils/kubernetes'
import {
  type ZonedDateTime,
  // getLocalTimeZone,
  now,
} from '@internationalized/date'

import {
  DatabaseTableRowFragment,
  useRestorePostgresMutation,
} from 'generated/graphql'
import { ReadinessT } from 'utils/status'

import {
  Button,
  Chip,
  ComboBox,
  DatePicker,
  EmptyState,
  FormField,
  ListBoxItem,
  Modal,
  RestoreIcon,
  Table,
  Tooltip,
  usePrevious,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import { isNil, memoize } from 'lodash'
// import moment from 'moment'
import moment from 'moment-timezone'

import Fuse from 'fuse.js'

import { TableText, Usage, numishSort } from '../cluster/TableElements'

import { DatabaseWithId } from './DatabaseManagement'

function RestoreDatabase({ name, namespace, refetch }) {
  const [isOpen, setIsOpen] = useState(false)
  const [timestamp, _] = useState('')
  const theme = useTheme()
  const localTz = moment.tz.guess()

  const [date, setDate] = useState<ZonedDateTime>(now(localTz))

  const [selectedTz, setSelectedTz] = useState(localTz)
  const prevSelectedTz = usePrevious(selectedTz)

  const allTzs = getTimezones()

  console.log('all tzs', allTzs.length)

  useEffect(() => {
    if (selectedTz !== prevSelectedTz) {
      setDate(date.set({ timeZone: selectedTz }))
    }
  }, [date, prevSelectedTz, selectedTz])

  const [mutation, { loading }] = useRestorePostgresMutation({
    variables: { name, namespace, timestamp: timestamp as unknown as Date },
    onCompleted: () => {
      setIsOpen(false)
      refetch()
    },
  })

  const onSubmit = useCallback(
    (e?: MouseEvent | FormEvent) => {
      e?.preventDefault()
      // mutation()
    },
    [mutation]
  )
  const onClose = useCallback(() => {
    setIsOpen(false)
  }, [])

  return (
    <Div onClick={(e) => e.stopPropagation()}>
      <Button
        floating
        startIcon={<RestoreIcon color={theme.colors['icon-default']} />}
        onClick={() => setIsOpen(true)}
      >
        Restore
      </Button>
      {isOpen && (
        <Modal
          header="Restore database from point in time"
          open={isOpen}
          onClose={onClose}
          size="medium"
          portal
          actions={
            <>
              <Button
                secondary
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                onClick={onSubmit}
                type="submit"
                loading={loading}
                marginLeft="medium"
              >
                Restore
              </Button>
            </>
          }
        >
          <Flex
            direction="column"
            gap="medium"
          >
            <FormField label="Location">
              <TimezoneComboBox
                selectedTz={selectedTz}
                setSelectedTz={setSelectedTz}
              />
            </FormField>
            <FormField
              label="Date and time"
              action="Limited to past 5 days"
            >
              <DatePicker
                value={date}
                onChange={(date) => {
                  setDate(date as ZonedDateTime)
                }}
                minValue={now(localTz).subtract({ days: 5 })}
                maxValue={now(localTz)}
                elementProps={{}}
              />
            </FormField>
          </Flex>
        </Modal>
      )}
    </Div>
  )
}

function TimezoneComboBox({
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
        threshold: !comboInputTz ? 0.3 : 1,
        keys: ['friendlyName'],
      }),
    [comboInputTz, timezones]
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

export type ContainerStatus = { name: string; readiness: ReadinessT }

const columnHelper = createColumnHelper<DatabaseWithId>()

export const ColName = columnHelper.accessor((row) => row.metadata.name, {
  id: 'name',
  enableGlobalFilter: true,
  enableSorting: true,
  cell: (props) => (
    <Tooltip
      label={props.getValue()}
      placement="top-start"
    >
      <TableText>{props.getValue()}</TableText>
    </Tooltip>
  ),
  header: 'Name',
})

export const ColNamespace = columnHelper.accessor(
  (row) => row.metadata.namespace,
  {
    id: 'namespace',
    enableGlobalFilter: false,
    enableSorting: true,
    cell: (props) => (
      <Tooltip
        label={props.getValue()}
        placement="top-start"
      >
        <TableText>{props.getValue()}</TableText>
      </Tooltip>
    ),
    header: 'Namespace',
  }
)

export const ColVersion = columnHelper.accessor(
  (row) => row.spec.postgresql?.version,
  {
    id: 'version',
    enableGlobalFilter: false,
    enableSorting: true,
    cell: (props) => <TableText>{props.getValue()}</TableText>,
    header: 'Version',
  }
)

export const ColInstances = columnHelper.accessor(
  (row) => row.spec.numberOfInstances,
  {
    id: 'numberOfInstances',
    enableGlobalFilter: false,
    enableSorting: true,
    cell: (props) => <TableText>{props.getValue()}</TableText>,
    header: 'Instances',
  }
)

// Custom locale for minimal relative time units
moment.defineLocale('en-min', {
  parentLocale: 'en',
  relativeTime: {
    s: '1 s',
    ss: '%d s',
    d: '1 d',
    dd: '%dd',
    m: '1 min',
    mm: '%d min',
    h: '1 h',
    hh: '%d h',
    M: '1 mo',
    MM: '%d mo',
    y: '1 y',
    yy: '%d y',
  },
})

export const ColAge = columnHelper.accessor(
  (row) => moment().diff(moment(row.metadata.creationTimestamp), 'days', true),
  {
    id: 'age',
    enableGlobalFilter: false,
    enableSorting: true,
    cell: ({ row: { original } }) => {
      // Set locale to get minimal time units
      moment.locale('en-min')
      const age = moment(original.metadata.creationTimestamp).fromNow(true)

      // Make sure to reset locale to default
      moment.locale('en')

      return <TableText>{age}</TableText>
    },
    header: 'Age',
  }
)

export const ColVolume = columnHelper.accessor(
  (row) => memoryParser(row.spec.volume?.size),
  {
    id: 'volume',
    enableGlobalFilter: false,
    enableSorting: true,
    cell: ({ getValue }) => {
      const size = memoryFormat(getValue())

      return <TableText>{typeof size === 'string' ? size : '–'}</TableText>
    },
    header: 'Volume',
  }
)

const statusToSeverity = (status: string) => {
  if (status.match(/fail/m)) {
    return 'error'
  }
  if (status.match(/running/i)) {
    return 'success'
  }

  return 'warning'
}

export const ColStatus = columnHelper.accessor(
  (row) => row.status.clusterStatus,
  {
    id: 'status',
    enableGlobalFilter: false,
    enableSorting: true,
    cell: ({ getValue }) => {
      const val = getValue()
      const severity = statusToSeverity(val || '')

      return !!val && <Chip severity={severity}>{val}</Chip>
    },
    header: 'Status',
  }
)

export const ColMemoryReservation = columnHelper.accessor(
  (row) => memoryParser(row?.spec?.resources?.requests?.memory) || 0,
  {
    id: 'memory',
    enableSorting: true,
    sortingFn: numishSort,
    cell: ({ row: { original }, getValue }) => {
      const requests = getValue()
      const limits = memoryParser(original.spec.resources?.limits?.memory)

      return (
        <Usage
          used={isNil(requests) ? undefined : memoryFormat(requests ?? 0)}
          total={isNil(limits) ? undefined : memoryFormat(limits ?? 0)}
        />
      )
    },
    header: 'Memory',
  }
)

export const ColCpuReservation = columnHelper.accessor(
  (row) => cpuParser(row.spec.resources?.requests?.cpu),
  {
    id: 'cpu-reservations',
    enableSorting: true,
    sortingFn: numishSort,
    cell: ({ row: { original }, getValue }) => {
      const requests = getValue()
      const limits = cpuParser(original.spec.resources?.limits?.cpu)

      return (
        <Usage
          used={requests}
          total={limits}
        />
      )
    },
    header: 'CPU',
  }
)

export const ColActions = (refetch) =>
  columnHelper.display({
    id: 'actions',
    cell: ({ row: { original } }: any) => (
      <Flex
        flexDirection="row"
        gap="xxsmall"
      >
        <RestoreDatabase
          name={original.name}
          namespace={original.namespace}
          refetch={refetch}
        />
      </Flex>
    ),
    header: '',
  })

type DatabaseListProps = Omit<ComponentProps<typeof Table>, 'data'> & {
  databases?: DatabaseTableRowFragment[]
  columns: any[]
}

export const DatabasesList = memo(
  ({ databases, columns, ...props }: DatabaseListProps) => {
    const filteredDbs = useMemo(
      () =>
        (databases || []).filter(
          (database): database is DatabaseTableRowFragment => !!database
        ),
      [databases]
    )

    if (!databases || filteredDbs.length === 0) {
      return <EmptyState message="No databases available." />
    }

    return (
      <Table
        data={filteredDbs}
        columns={columns}
        // virtualizeRows
        {...props}
      />
    )
  }
)

const getTimezones = memoize(() => {
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

  const POP_THRESHOLD = 7000000

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
    } else if (newZone.population > POP_THRESHOLD) {
      x[offset].push(newZone)
    }
  }

  return Object.values(x)
    .flatMap((z) => z)
    .sort((a, b) => a.numericalOffset - b.numericalOffset)
})
