import { A, Flex, H1 } from 'honorable'

import Banner from '../components/Banner'

export default {
  title: 'Banner',
  component: Banner,
}

function Template(args: any) {
  return (
    <Flex
      direction="column"
      align="flex-start"
      gap="medium"
    >
      <Banner
        heading="You have an error."
        severity="error"
        action={(
          <A
            href="#"
            onClick={e => e.preventDefault()}
          >
            Fix it
          </A>
        )}
        {...args}
      />
      <Banner
        heading="Here’s some info."
        severity="info"
        {...args}
      />
      <Banner
        heading="Success!"
        severity="success"
        action={(
          <A
            href="#"
            onClick={e => e.preventDefault()}
          >
            Next
          </A>
        )}
        {...args}
      />
      <Banner
        heading="You have an error"
        severity="error"
        {...args}
      >
        {
          'Your {cluster name} had three incidents while attempting to upgrade. To fix them, visit '
        }
        <A
          inline
          href="#"
          onClick={e => e.preventDefault()}
        >
          incidents
        </A>
        .
      </Banner>
      <Banner
        heading="Here's some info"
        severity="info"
        {...args}
      >
        {
          'Your {cluster name} had three incidents while attempting to upgrade. To fix them, visit '
        }
        <A
          inline
          href="#"
          onClick={e => e.preventDefault()}
        >
          incidents
        </A>
        .
      </Banner>
      <Banner
        heading="Success!"
        severity="success"
        {...args}
      >
        {
          'Your {cluster name} had three incidents while attempting to upgrade. To fix them, visit '
        }
        <A
          inline
          href="#"
          onClick={e => e.preventDefault()}
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
      <Banner
        {...args}
        severity="error"
      >
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
      <H1
        marginTop="medium"
        subtitle2
      >
        onClose=fn
      </H1>
      <Banner
        {...args}
        fullWidth
        onClose={() => {}}
      >
        Having a full width Banner can sometimes be useful.
      </Banner>
    </Flex>
  )
}

export const Default = Template.bind({})

Default.args = {}
