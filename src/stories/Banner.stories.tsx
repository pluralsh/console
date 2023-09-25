import { A, Flex, H1 } from 'honorable'

import Banner, { BANNER_SEVERITIES } from '../components/Banner'

export default {
  title: 'Banner (AKA Toast Content)',
  component: Banner,
  argTypes: {
    closeButton: {
      type: 'boolean',
    },
    severity: {
      type: 'select',
      options: BANNER_SEVERITIES,
      defaultValue: 'info',
    },
  },
}

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
          <A
            href="#"
            onClick={(e) => e.preventDefault()}
          >
            Fix it
          </A>
        }
        {...args}
      />
      <Banner
        heading="Here’s some info."
        {...args}
      />
      <Banner
        heading="Success!"
        action={
          <A
            href="#"
            onClick={(e) => e.preventDefault()}
          >
            Next
          </A>
        }
        {...args}
      />
      <Banner
        heading="You have an error"
        {...args}
      >
        {
          'Your {cluster name} had three incidents while attempting to upgrade. To fix them, visit '
        }
        <A
          inline
          href="#"
          onClick={(e) => e.preventDefault()}
        >
          incidents
        </A>
        .
      </Banner>
      <Banner
        heading="Here's some info"
        {...args}
      >
        {
          'Your {cluster name} had three incidents while attempting to upgrade. To fix them, visit '
        }
        <A
          inline
          href="#"
          onClick={(e) => e.preventDefault()}
        >
          incidents
        </A>
        .
      </Banner>
      <Banner
        heading="Success!"
        {...args}
      >
        {
          'Your {cluster name} had three incidents while attempting to upgrade. To fix them, visit '
        }
        <A
          inline
          href="#"
          onClick={(e) => e.preventDefault()}
        >
          incidents
        </A>
        .
      </Banner>

      <H1
        marginTop="medium"
        subtitle2
      >
        Backwards compatibility only
      </H1>
      <Banner {...args}>
        You really shouldn't have content here without a heading, but including
        to make sure old usage still looks good.{' '}
        <A color="action-link-inline">Now go do something</A>.
      </Banner>

      <H1
        marginTop="medium"
        subtitle2
      >
        fullWidth=true
      </H1>
      <Banner
        {...args}
        fullWidth
      >
        Having a full width Banner can sometimes be useful.
      </Banner>
    </Flex>
  )
}

export const Default = Template.bind({})

Default.args = {
  closeButton: false,
  severity: 'info',
}
