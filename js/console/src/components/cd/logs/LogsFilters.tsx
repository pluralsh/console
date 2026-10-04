import {
  CloseIcon,
  ComboBox,
  Flex,
  FlexProps,
  ListBoxFooterPlus,
  ListBoxItem,
  Select,
  SelectButton,
} from '@pluralsh/design-system'
import { FillLevelDiv } from 'components/utils/FillLevelDiv'
import {
  LogFacetInput,
  LogLineFragment,
  LogQueryOperator,
  LogTimeRange,
  useLogLabelsQuery,
} from 'generated/graphql'
import { useMemo, useState } from 'react'
import styled from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'
import { isEmpty } from 'lodash'
import { TruncateEnd } from '../../utils/table/Truncate'

type FilterSize = 'small' | 'medium'

export function LogsQueryOperatorSelect({
  operator,
  setOperator,
  disabled = false,
  size = 'medium',
  ...props
}: {
  operator: LogQueryOperator
  setOperator: (operator: LogQueryOperator) => void
  disabled?: boolean
  size?: FilterSize
} & FlexProps) {
  return (
    <Flex
      tooltip={{ label: 'Match any (OR) or all (AND) search terms' }}
      {...props}
    >
      <FillLevelDiv fillLevel={1}>
        <Select
          size={size}
          selectedKey={operator}
          onSelectionChange={(key) => setOperator(key as LogQueryOperator)}
          isDisabled={disabled}
        >
          {Object.values(LogQueryOperator).map((op) => (
            <ListBoxItem
              key={op}
              label={op}
              selected={op === operator}
            />
          ))}
        </Select>
      </FillLevelDiv>
    </Flex>
  )
}

export function LogsLabelsPicker({
  logs,
  clusterId,
  serviceId,
  query,
  time,
  addLabel,
  selectedLabels,
  size = 'medium',
  ...props
}: {
  logs: LogLineFragment[]
  clusterId?: string
  serviceId?: string
  query?: string
  time?: LogTimeRange
  addLabel: (key: string, value: string) => void
  selectedLabels: LogFacetInput[]
  size?: FilterSize
} & FlexProps) {
  const [field, setField] = useState('')
  const [comboBoxInput, setComboBoxInput] = useState('')
  const small = size === 'small'

  const facetKeys = useMemo(() => {
    const allKeys = new Set<string>()
    logs.forEach(({ facets }) =>
      facets?.forEach((facet) => facet?.key && allKeys.add(facet.key))
    )
    const selectedSet = new Set<string>(selectedLabels.map(({ key }) => key))
    return Array.from(allKeys.difference(selectedSet))
  }, [logs, selectedLabels])

  const { data, loading } = useLogLabelsQuery({
    variables: { field, clusterId, serviceId, query, time },
    skip: !field,
    fetchPolicy: 'cache-and-network',
  })

  const filteredLabelOptions = useMemo(() => {
    const value = comboBoxInput.trim().toLowerCase()
    const labelOptions = data?.logLabels?.filter(isNonNullable) ?? []

    if (!value) return labelOptions

    return labelOptions.filter(({ label }) =>
      label.toLowerCase().includes(value)
    )
  }, [comboBoxInput, data?.logLabels])

  const clearSelections = () => {
    setField('')
    setComboBoxInput('')
  }

  return (
    <Flex {...props}>
      <FillLevelDiv
        fillLevel={1}
        css={{ minWidth: small ? 72 : undefined, flexShrink: small ? 1 : 0 }}
      >
        <Select
          size={size}
          width={240}
          isDisabled={isEmpty(facetKeys)}
          selectedKey={field}
          onSelectionChange={(key) => {
            setField(String(key ?? ''))
            setComboBoxInput('')
          }}
          triggerButton={
            <LabelsFieldSelectButtonSC
              size={size}
              isDisabled={isEmpty(facetKeys)}
            >
              <TruncateEnd css={{ maxWidth: small ? 96 : 180, minWidth: 0 }}>
                {field || 'Field'}
              </TruncateEnd>
            </LabelsFieldSelectButtonSC>
          }
          dropdownFooterFixed={
            field && (
              <ListBoxFooterPlus
                leftContent={<CloseIcon />}
                onClick={clearSelections}
              >
                Clear selection
              </ListBoxFooterPlus>
            )
          }
        >
          {facetKeys.map((key) => (
            <ListBoxItem
              key={key}
              label={key}
              css={{ wordBreak: 'break-word' }}
            />
          ))}
        </Select>
      </FillLevelDiv>
      <div css={small ? { flex: '0 1 160px', minWidth: 100 } : { flex: 1 }}>
        <ComboBox
          isDisabled={!field}
          startIcon={null}
          showArrow={false}
          allowsEmptyCollection
          loading={loading}
          inputValue={comboBoxInput}
          onInputChange={setComboBoxInput}
          onSelectionChange={(key) => {
            if (!field || !key) return
            addLabel(field, `${key}`)
            clearSelections()
          }}
          inputProps={{
            small,
            placeholder: 'Value',
            style: { borderTopLeftRadius: 0, borderBottomLeftRadius: 0 },
          }}
        >
          {filteredLabelOptions.map(({ label }) => (
            <ListBoxItem
              key={label}
              label={label}
              textValue={label}
            />
          ))}
        </ComboBox>
      </div>
    </Flex>
  )
}

const LabelsFieldSelectButtonSC = styled(SelectButton)({
  borderTopRightRadius: 0,
  borderBottomRightRadius: 0,
  borderRight: 'none',
  minWidth: 0,
  whiteSpace: 'nowrap',
})
