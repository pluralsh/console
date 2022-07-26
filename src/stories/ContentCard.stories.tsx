import {
  Div, H1, P,
} from 'honorable'

import { ContentCard } from '../index'

export default {
  title: 'Content Card',
  component: null,
}

function Template() {
  return (
    <>
      <ContentCard
        marginBottom="xxlarge"
      >
        <Div
          alignItems="center"
          justifyContent="center"
          border="1px solid rgba(255,255,255, 0.05)"
          width="100%"
          padding="0"
        >
          <H1 subtitle2>Content Area</H1>
          <P caption>(hue="default")</P>
        </Div>
      </ContentCard>
      <ContentCard
        hue="lighter"
        marginBottom="xxlarge"
      >
        <Div
          alignItems="center"
          justifyContent="center"
          border="1px solid rgba(255,255,255, 0.05)"
          width="100%"
          padding="0"
        >
          <H1 subtitle2>Content Area</H1>
          <P caption>(hue="lighter")</P>
        </Div>
      </ContentCard>
      <ContentCard
        hue="lightest"
        marginBottom="xxlarge"
      >
        <Div
          alignItems="center"
          justifyContent="center"
          border="1px solid rgba(255,255,255, 0.05)"
          width="100%"
          padding="0"
        >
          <H1 subtitle2>Content Area</H1>
          <P caption>(hue="lightest")</P>
        </Div>
      </ContentCard>
    </>
  )
}

export const Default = Template.bind({})
Default.args = {
  clickable: false,
}
