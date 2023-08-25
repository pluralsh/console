import { Div, Flex } from 'honorable'
import { createColumnHelper } from '@tanstack/react-table'
import {
  ComponentProps,
  FormEvent,
  MouseEvent,
  ReactNode,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { cpuParser, memoryFormat, memoryParser } from 'utils/kubernetes'
import {
  type ZonedDateTime,
  now,
  toCalendarDateTime,
  toZoned,
} from '@internationalized/date'

import {
  DatabaseTableRowFragment,
  useRestorePostgresMutation,
} from 'generated/graphql'
import { ReadinessT } from 'utils/status'

import {
  Button,
  Chip,
  DatePicker,
  EmptyState,
  FormField,
  Modal,
  RestoreIcon,
  Table,
  Tooltip,
  usePrevious,
} from '@pluralsh/design-system'
import styled, { useTheme } from 'styled-components'
import { isNil } from 'lodash'
import moment from 'moment-timezone'

import { TableText, Usage, numishSort } from '../cluster/TableElements'

import { DatabaseWithId } from './DatabaseManagement'
import { TimezoneComboBox } from './TimezoneComboBox'

const RESTORE_LIMIT_DAYS = 3

function RestoreDatabase({ name, namespace, refetch }) {
  const [isOpen, setIsOpen] = useState(false)
  const theme = useTheme()

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
        <RestoreDatabaseModal
          name={name}
          namespace={namespace}
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          refetch={refetch}
        />
      )}
    </Div>
  )
}

const CorrectDateTimeLink = styled.a(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-danger'],
  a: {
    ...theme.partials.text.inlineLink,
  },
}))

function RestoreDatabaseModal({
  name,
  namespace,
  setIsOpen,
  refetch,
  isOpen,
}: {
  name: any
  namespace: any
  setIsOpen
  refetch: any
  isOpen: boolean
}) {
  const [timestamp, _] = useState('')
  const [dateRangeError, setDateRangeError] = useState<ReactNode>(null)
  const [selectedTz, setSelectedTz] = useState(moment.tz.guess())
  const roundedNow = now(selectedTz).set({
    second: 0,
    millisecond: 0,
  })
  const [dateTime, setDateTime] = useState<ZonedDateTime>(roundedNow)
  const prevSelectedTz = usePrevious(selectedTz)
  const minDateTime = roundedNow.subtract({
    days: RESTORE_LIMIT_DAYS,
  })
  const maxDateTime = roundedNow

  useEffect(() => {
    if (selectedTz !== prevSelectedTz) {
      setDateTime(toZoned(toCalendarDateTime(dateTime), selectedTz))
    }
  }, [dateTime, prevSelectedTz, selectedTz])

  const [_mutation, { loading }] = useRestorePostgresMutation({
    variables: { name, namespace, timestamp: timestamp as unknown as Date },
    onCompleted: () => {
      setIsOpen(false)
      refetch()
    },
  })

  const onSubmit = useCallback((e?: MouseEvent | FormEvent) => {
    e?.preventDefault()
    // mutation()
  }, [])

  const onClose = useCallback(() => {
    setIsOpen(false)
  }, [setIsOpen])

  const correctDateTime = (e) => {
    e.preventDefault?.()
    if (dateTime.compare(maxDateTime) > 0) {
      setDateTime(maxDateTime)
    } else if (dateTime.compare(minDateTime) < 0) {
      setDateTime(minDateTime)
    }
  }

  const modal = (
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
            disabled={!!dateRangeError}
            marginLeft="medium"
          >
            Restore
          </Button>
        </>
      }
    >
      <Flex
        direction="column"
        gap="large"
      >
        <FormField label="Location">
          <TimezoneComboBox
            selectedTz={selectedTz}
            setSelectedTz={setSelectedTz}
          />
        </FormField>
        <FormField
          label="Date and time"
          hint={
            dateRangeError ? (
              <CorrectDateTimeLink>
                Selection is not within the last {RESTORE_LIMIT_DAYS * 24}{' '}
                hours.{' '}
                <a
                  onClick={correctDateTime}
                  href="#"
                >
                  Fix
                </a>
              </CorrectDateTimeLink>
            ) : (
              `Limited to past ${RESTORE_LIMIT_DAYS * 24} hours`
            )
          }
          error={!!dateRangeError}
        >
          <DatePicker
            value={dateTime}
            onChange={(date) => {
              setDateTime(date as ZonedDateTime)
            }}
            onValidationChange={(v) => {
              setDateRangeError(v === 'invalid')
            }}
            minValue={minDateTime}
            maxValue={maxDateTime}
            elementProps={{}}
          />
        </FormField>
      </Flex>
    </Modal>
  )

  return modal
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
