import { type Dispatch, createElement } from 'react'
import styled from 'styled-components'
import { useRadioGroupState } from 'react-stately'
import { useRadioGroup } from 'react-aria'

import SelectItem from '../../SelectItem'
import { PROVIDERS } from '../misc'
import { RadioContext } from '../../RadioGroup'

import Control from './Control'

const ProvidersWrap = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'row',
  gap: theme.spacing.small,
}))

type ProviderControlProps = {
  header: string
  caption?: string
  providerId: string
  setProviderId: Dispatch<string>
}

export default function ProviderControl({
  header,
  caption,
  providerId,
  setProviderId,
}: ProviderControlProps) {
  const providerRadioGroupProps = {
    label: header,
    description: 'caption',
    value: providerId,
    onChange: (id: string) => {
      setProviderId(id)
    },
  }
  const state = useRadioGroupState(providerRadioGroupProps)
  const { radioGroupProps, labelProps } = useRadioGroup(
    providerRadioGroupProps,
    state
  )

  return (
    <Control
      header={header}
      caption={caption}
      labelProps={labelProps}
    >
      <ProvidersWrap {...radioGroupProps}>
        <RadioContext.Provider value={state}>
          {PROVIDERS.map(({ id, name, icon }) => (
            <SelectItem
              label={name}
              name={name}
              icon={createElement(icon, { fullColor: true })}
              value={id}
            />
          ))}
        </RadioContext.Provider>
      </ProvidersWrap>
    </Control>
  )
}
