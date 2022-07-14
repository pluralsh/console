import React from 'react'

import { ProviderIcons } from './constants'

export function Provider({ provider, width }) {
  const url = ProviderIcons[provider]

  return (
    <img
      alt={provider}
      width={`${width}px`}
      height={`${width}px`}
      src={url}
    />
  )
}
