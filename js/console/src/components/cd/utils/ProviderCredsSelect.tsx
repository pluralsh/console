import { useMemo } from 'react'
import { useTheme } from 'styled-components'
import {
  CertificateIcon,
  ListBoxItem,
  Select,
  SelectPropsSingle,
} from '@pluralsh/design-system'

import { ProviderCredential } from '../../../generated/graphql'

const DEFAULT_TEXT = 'Default provider credentials'

export function ProviderCredentialSelect({
  credentials,
  ...props
}: {
  credentials: ProviderCredential[]
} & Omit<SelectPropsSingle, 'children' | 'selectionMode'>) {
  const theme = useTheme()
  const items = useMemo(
    () => [
      <ListBoxItem
        key=""
        textValue={DEFAULT_TEXT}
        label={
          <span css={{ color: theme.colors['text-light'] }}>
            {DEFAULT_TEXT}
          </span>
        }
      />,
      ...credentials.map((p) => (
        <ListBoxItem
          key={p.id}
          label={p.name}
        />
      )),
    ],
    [credentials, theme.colors]
  )

  return (
    <Select
      leftContent={<CertificateIcon />}
      {...props}
      selectionMode="single"
    >
      {items}
    </Select>
  )
}
