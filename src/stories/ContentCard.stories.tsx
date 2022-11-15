import {
  Div,
  H1,
  H2,
  P,
} from 'honorable'
import { ComponentProps } from 'react'

import { ContentCard } from '../index'

export default {
  title: 'Content Card',
  component: null,
}

const content = (
  <>
    <p>
      Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
      tempor incididunt ut labore et dolore magna aliqua. Nunc eget lorem dolor
      sed viverra ipsum nunc aliquet bibendum. Ultrices dui sapien eget mi proin
      sed libero enim sed. Fames ac turpis egestas maecenas pharetra. Orci eu
      lobortis elementum nibh tellus molestie nunc non blandit. Curabitur vitae
      nunc sed velit dignissim sodales. Nec feugiat in fermentum posuere. Et leo
      duis ut diam quam. Amet nulla facilisi morbi tempus iaculis urna id
      volutpat. In ornare quam viverra orci. Nec feugiat nisl pretium fusce id
      velit. Purus viverra accumsan in nisl nisi scelerisque. Massa sed
      elementum tempus egestas sed. Netus et malesuada fames ac turpis egestas
      sed tempus.
    </p>
    <p>
      Integer malesuada nunc vel risus commodo. Feugiat in ante metus dictum at
      tempor commodo. Mi quis hendrerit dolor magna eget est lorem ipsum.
      Sagittis purus sit amet volutpat consequat mauris nunc congue. Quisque id
      diam vel quam elementum pulvinar etiam. Tellus elementum sagittis vitae et
      leo duis ut diam. A erat nam at lectus urna duis. Amet consectetur
      adipiscing elit duis tristique sollicitudin nibh sit. Senectus et netus et
      malesuada fames ac. Vitae proin sagittis nisl rhoncus mattis rhoncus.
      Semper viverra nam libero justo laoreet sit amet cursus sit. Mauris nunc
      congue nisi vitae suscipit tellus mauris a diam. Aenean sed adipiscing
      diam donec adipiscing tristique. Pharetra vel turpis nunc eget lorem
      dolor. Nec dui nunc mattis enim ut. Elementum nibh tellus molestie nunc
      non blandit. At urna condimentum mattis pellentesque id. Sagittis id
      consectetur purus ut faucibus pulvinar. Quis imperdiet massa tincidunt
      nunc pulvinar sapien et ligula ullamcorper.
    </p>
  </>
)

const cards: ComponentProps<typeof ContentCard>[] = [
  { fillLevel: undefined },
  { fillLevel: 1 },
  { fillLevel: 2 },
  { fillLevel: 3 },
]

function Template() {
  return cards.map(({ fillLevel }) => (
    <Div>
      <H1 caption>
        fillLevel={fillLevel === undefined ? 'undefined' : `{${fillLevel}}`}
      </H1>
      <ContentCard
        fillLevel={fillLevel}
        marginBottom="xxlarge"
        maxHeight="250px"
      >
        <Div
          alignItems="center"
          justifyContent="center"
          border="1px solid rgba(255,255,255, 0.05)"
          width="100%"
          padding="0"
        >
          <H2 subtitle2>Content Area</H2>
          <P caption>(fillLevel="default")</P>
          <P>{content}</P>
        </Div>
      </ContentCard>
    </Div>
  ))
}

export const Default = Template.bind({})
Default.args = {
  clickable: false,
}
