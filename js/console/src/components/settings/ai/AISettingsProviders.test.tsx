import { styledThemeDark } from '@pluralsh/design-system'
import { fireEvent, render, screen } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { describe, expect, it, vi } from 'vitest'

import { BedrockEndpoint } from '../../../generated/graphql'
import { updateSettings as reduceSettings } from './AISettingsProvider'
import { BedrockSettings } from './AISettingsProviders'

const existingModelId = 'anthropic.claude-sonnet-4-6'
const existingProfileArn =
  'arn:aws:bedrock:us-east-1:123456789012:application-inference-profile/existing'

function renderBedrockSettings(updateSettings = vi.fn()) {
  render(
    <ThemeProvider theme={styledThemeDark}>
      <BedrockSettings
        enabled
        settings={{
          region: 'us-east-1',
          endpoint: BedrockEndpoint.Runtime,
          modelSettings: [
            {
              modelId: existingModelId,
              inferenceProfileArn: existingProfileArn,
            },
          ],
        }}
        updateSettings={updateSettings}
      />
    </ThemeProvider>
  )

  return updateSettings
}

describe('BedrockSettings', () => {
  it('lists and adds application inference profile mappings', () => {
    const updateSettings = renderBedrockSettings()
    const newModelId = 'amazon.nova-pro-v1:0'
    const newProfileArn =
      'arn:aws:bedrock:us-east-1:123456789012:application-inference-profile/new'

    fireEvent.click(screen.getByRole('button', { name: 'Advanced settings' }))

    expect(
      screen.getByText(`${existingModelId} -> ${existingProfileArn}`)
    ).toBeTruthy()

    fireEvent.click(
      screen.getByText(`${existingModelId} -> ${existingProfileArn}`)
    )
    expect(updateSettings).toHaveBeenCalledWith({ modelSettings: [] })
    updateSettings.mockClear()

    fireEvent.change(screen.getByPlaceholderText('Model ID'), {
      target: { value: newModelId },
    })
    fireEvent.change(screen.getByPlaceholderText('Inference profile ARN'), {
      target: { value: newProfileArn },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add mapping' }))

    expect(updateSettings).toHaveBeenCalledWith({
      modelSettings: [
        {
          modelId: existingModelId,
          inferenceProfileArn: existingProfileArn,
        },
        {
          modelId: newModelId,
          inferenceProfileArn: newProfileArn,
        },
      ],
    })
  })

  it('replaces model settings arrays when removing mappings', () => {
    const updated = reduceSettings(
      {
        bedrock: {
          modelSettings: [
            {
              modelId: existingModelId,
              inferenceProfileArn: existingProfileArn,
            },
          ],
        },
      },
      { bedrock: { modelSettings: [] } }
    )

    expect(updated.bedrock?.modelSettings).toEqual([])
    expect(Object.isFrozen(updated.bedrock?.modelSettings)).toBe(false)
  })
})
