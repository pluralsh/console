import CheckedShieldIcon from '../components/icons/CheckedShieldIcon'

import { useTheme } from 'styled-components'

import { Flex, PageCard } from '../index'
import type { Meta, StoryObj } from '@storybook/react'

const meta = {
  title: 'Page Card',
  component: PageCard,
} satisfies Meta<any>

export default meta
type Story = StoryObj<any>

function Template() {
  const theme = useTheme()

  return (
    <Flex
      flexWrap="wrap"
      gap="xlarge"
      flexDirection="column"
      maxWidth="240px"
    >
      <PageCard
        heading="Airbyte"
        subheading="Verified"
        subheadingIcon={<CheckedShieldIcon />}
        icon={{
          url: '/logos/airbyte-logo.svg',
        }}
      />
      <PageCard
        heading="Michael Guarino"
        subheading={
          <>
            Admin at{' '}
            <a
              href="#"
              css={theme.partials.text.inlineLink}
            >
              Plural
            </a>
          </>
        }
        icon={{
          url: 'photo.png',
          spacing: 'none',
        }}
      />
      <PageCard
        icon={{
          url: '/logos/plural-logomark-only-white.svg',
        }}
        heading="plrlDemo1"
        subheading="GCP"
      />
      <PageCard
        icon={{
          name: 'Jimmy J Unknown',
        }}
        heading="Jimmy J Unknown"
      />

      <PageCard
        heading="airflow-identity"
        icon={{
          url: '/logos/airflow-logo.svg',
        }}
      >
        Optional child content lorem ipsum dolor sit amet
      </PageCard>
    </Flex>
  )
}

export const Default: Story = {
  render: Template,
  args: {},
}
