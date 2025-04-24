import { Dispatch, ReactNode, SetStateAction, useEffect } from 'react'
import styled from 'styled-components'
import { Input } from '@pluralsh/design-system'
import { DeleteIconButton } from '../../../../../utils/IconButtons.tsx'
import { EditableDiv } from 'components/utils/EditableDiv.tsx'

interface OpaqueProps {
  data: { key: string; value: string }[]
  setData: Dispatch<SetStateAction<{ key: string; value: string }[]>>
  setValid: Dispatch<SetStateAction<boolean>>
}

function Opaque({ data, setData, setValid }: OpaqueProps): ReactNode {
  useEffect(() => {
    setValid(data.every((entry) => !!entry.key && !!entry.value))
  }, [data, setValid])

  return data.map((entry, index) => (
    <DataEntry
      index={index}
      data={data}
      setData={setData}
      entry={entry}
    />
  ))
}

export const DataEntry = styled(DataEntryUnstyled)(({ theme }) => ({
  display: 'flex',
  gap: '16px',
  flexDirection: 'column',

  '.inputContainer': {
    display: 'flex',
    gap: theme.spacing.medium,
    flexDirection: 'row',

    '> div': {
      width: '100%',
    },
  },

  '.textArea': {
    padding: `${theme.spacing.xsmall}px ${theme.spacing.medium}px`,
    border: theme.borders.input,
    borderRadius: theme.borderRadiuses.medium,
    backgroundColor: theme.colors['fill-two'],
    '&:focus': {
      border: theme.borders['outline-focused'],
    },
    maxHeight: '176px',
  },
}))

function DataEntryUnstyled({
  index,
  entry,
  data,
  setData,
  ...props
}): ReactNode {
  return (
    <div
      key={index}
      {...props}
    >
      <div className="inputContainer">
        <Input
          placeholder="Key"
          value={entry.key}
          onChange={(e) => {
            const newData = [...data]
            newData[index].key = e.target.value
            setData(newData)
          }}
        />
        <DeleteIconButton
          size="large"
          onClick={() => {
            const newData = [...data]
            newData.splice(index, 1)
            setData(newData)
          }}
        />
      </div>

      <EditableDiv
        className="textArea"
        placeholder="Value"
        setValue={(val) => {
          const newData = [...data]
          newData[index].value = val
          setData(newData)
        }}
        initialValue={entry.value}
      />
    </div>
  )
}

export { Opaque }
