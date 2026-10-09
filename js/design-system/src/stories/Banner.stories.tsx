import { useState } from 'react'
import styled from 'styled-components'

import Banner, { BANNER_SEVERITIES } from '../components/Banner'
import Flex from '../components/Flex'
import type { Meta, StoryObj } from '@storybook/react'

const Link = styled.a(({ theme }) => ({
  ...theme.partials.text.inlineLink,
}))

const Heading = styled.h1(({ theme }) => ({
  margin: 0,
  marginTop: 16,
  ...theme.partials.text.subtitle2,
}))

const meta = {
  title: 'Banner',
  component: Banner,
  argTypes: {
    closeButton: {
      type: 'boolean',
    },
    severity: {
      control: 'select',
      options: BANNER_SEVERITIES,
    },
  },
} satisfies Meta<any>

export default meta
type Story = StoryObj<any>

function Template({ closeButton, ...args }: any) {
  if (closeButton) {
    args.onClose = (e: any) => e.preventDefault()
  }

  return (
    <Flex
      direction="column"
      align="flex-start"
      gap="medium"
    >
      <Banner
        heading="You have an error."
        action={
          <Link
            href="#"
            onClick={(e) => e.preventDefault()}
          >
            Fix it
          </Link>
        }
        {...args}
      />
      <Banner
        heading="Here’s some info."
        {...args}
      />
      <Banner
        heading="Here's some info"
        {...args}
      >
        {
          'Your {cluster name} had three incidents while attempting to upgrade. To fix them, visit '
        }
        <Link
          href="#"
          onClick={(e) => e.preventDefault()}
        >
          incidents
        </Link>
        .
      </Banner>

      <Heading>Backwards compatibility only</Heading>
      <Banner {...args}>
        You really shouldn&apos;t have content here without a heading, but
        including to make sure old usage still looks good.{' '}
        <Link>Now go do something</Link>.
      </Banner>

      <Heading>fullWidth=true</Heading>
      <Banner
        {...args}
        fullWidth
      >
        Having a full width Banner can sometimes be useful.
      </Banner>
    </Flex>
  )
}

const DESIGN_ORDER = ['danger', 'info', 'warning', 'success'] as const

const compactHeading = {
  danger: 'You have an error.',
  info: 'Here’s some info.',
  warning: 'Here’s a warning.',
  success: 'Success!',
} as const

function ActionLink() {
  return (
    <Link
      href="#"
      onClick={(e) => e.preventDefault()}
    >
      Action
    </Link>
  )
}

function Description() {
  return (
    <>
      {
        'Your {cluster name} had three incidents while attempting to upgrade. To fix them, visit '
      }
      <Link
        href="#"
        onClick={(e) => e.preventDefault()}
      >
        incidents
      </Link>
      .
    </>
  )
}

function NotificationDesignTemplate() {
  const [dismissed, setDismissed] = useState<ReadonlyArray<string>>([])
  const dismiss = (key: string) =>
    setDismissed((current) =>
      current.includes(key) ? current : [...current, key]
    )

  return (
    <Flex
      direction="column"
      align="flex-start"
      gap="xxlarge"
      width={464}
    >
      {DESIGN_ORDER.map((severity) => {
        const key = `${severity}-compact`

        if (dismissed.includes(key)) return null

        return (
          <Banner
            key={key}
            severity={severity}
            heading={compactHeading[severity]}
            action={<ActionLink />}
            fullWidth={severity !== 'success'}
            onClose={() => dismiss(key)}
          />
        )
      })}
      {DESIGN_ORDER.map((severity) => {
        const key = `${severity}-detail`

        if (dismissed.includes(key)) return null

        return (
          <Banner
            key={key}
            severity={severity}
            heading={compactHeading[severity]}
            fullWidth
            onClose={() => dismiss(key)}
          >
            <Description />
          </Banner>
        )
      })}
    </Flex>
  )
}

export const Default: Story = {
  render: Template,
  args: {
    closeButton: false,
    severity: 'info',
  },
}

export const NotificationDesign: Story = {
  render: NotificationDesignTemplate,
  globals: {
    theme: 'dark',
  },
}
