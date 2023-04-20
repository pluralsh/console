import { type Dispatch, createElement } from 'react'
import styled from 'styled-components'

import SelectItem from '../../SelectItem'
import { PROVIDERS } from '../misc'

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
  return (
    <Control
      header={header}
      caption={caption}
    >
      <ProvidersWrap>
        {PROVIDERS.map(({ id, name, icon }) => (
          <SelectItem
            label={name}
            icon={createElement(icon, { fullColor: true })}
            value={id}
            checked={providerId === id}
            onChange={({ target: { checked } }: any) => {
              if (checked) setProviderId(id)
            }}
          />
        ))}
      </ProvidersWrap>
    </Control>
  )
}
