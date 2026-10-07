import { useTheme } from 'styled-components'

import { Sidecar, SidecarItem, type SidecarProps } from '../index'
import type { Meta, StoryObj } from '@storybook/react'

const meta = {
  title: 'Sidecar',
  component: Sidecar,
} satisfies Meta<any>

export default meta
type Story = StoryObj<any>

const wordWrapOnSlashes = (url: string) =>
  url
    .split(/\/(?!\/)/g)
    .flatMap((str, i, arr) =>
      i >= arr.length - 1 ? str : [`${str}/`, <wbr />]
    )

function Template({ heading, ...props }: SidecarProps) {
  const theme = useTheme()

  return (
    <div>
      <div
        style={{
          marginBottom: 48,
          maxWidth: 200,
        }}
      >
        <Sidecar
          heading={heading}
          {...props}
        >
          <SidecarItem heading="Cluster name">
            cf0e8944-af70-49ae-b08c-7b38b706fe85
          </SidecarItem>
          <SidecarItem heading="Git url">
            <a
              target="_blank"
              rel="noreferrer noopener"
              href="http://github.com/pluralsh/plural"
              css={theme.partials.text.inlineLink}
            >
              {wordWrapOnSlashes(
                'github.com/areallylongstringwithnohyphens/plural/anotherlongstring'
              )}
            </a>
          </SidecarItem>
          <SidecarItem heading="Acked">
            01814fdf-09b2-4ea5-b2d3-277192808b28
          </SidecarItem>
          <SidecarItem heading="Last pinged">Jun 14, 2022 11:34 AM</SidecarItem>
        </Sidecar>
      </div>
    </div>
  )
}

export const Default: Story = {
  render: Template,
  args: {
    heading: 'Sidecar Title',
  },
}
