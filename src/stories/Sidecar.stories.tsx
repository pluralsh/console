import { A, Div } from 'honorable'

import {
  BrowserIcon,
  CertificateIcon,
  DiscordIcon,
  GitHubLogoIcon,
  ScrollIcon,
  Sidecar,
  SidecarButton,
  SidecarItem,
  type SidecarProps,
  SlackLogoIcon,
  TwitterIcon,
} from '../index'

export default {
  title: 'Sidecar',
  component: Sidecar,
}

const wordWrapOnSlashes = (url: string) =>
  url
    .split(/\/(?!\/)/g)
    .flatMap((str, i, arr) =>
      i >= arr.length - 1 ? str : [`${str}/`, <wbr />]
    )

function Template({ heading, ...props }: SidecarProps) {
  return (
    <Div>
      <Div
        marginBottom="xxlarge"
        _last={{ marginBottom: 0 }}
        width="min-content"
        maxWidth="176px"
      >
        <Sidecar
          heading={heading}
          {...props}
        >
          <SidecarButton
            as="A"
            href="#"
            startIcon={<BrowserIcon />}
          >
            Homepage
          </SidecarButton>
          <SidecarButton startIcon={<CertificateIcon />}>
            Licenses
          </SidecarButton>
          <SidecarButton startIcon={<ScrollIcon />}>Docs</SidecarButton>
          <SidecarButton startIcon={<TwitterIcon />}>Twitter</SidecarButton>
          <SidecarButton startIcon={<DiscordIcon />}>Discord</SidecarButton>
          <SidecarButton startIcon={<SlackLogoIcon />}>Slack</SidecarButton>
          <SidecarButton startIcon={<GitHubLogoIcon />}>Github</SidecarButton>
        </Sidecar>
      </Div>
      <Div
        marginBottom="xxlarge"
        maxWidth="200px"
        _last={{ marginBottom: 0 }}
      >
        <Sidecar
          heading={heading}
          {...props}
        >
          <SidecarItem heading="Cluster name">
            cf0e8944-af70-49ae-b08c-7b38b706fe85
          </SidecarItem>
          <SidecarItem heading="Git url">
            <A
              inline
              target="_blank"
              noreferrer
              noopener
              href="http://github.com/pluralsh/plural"
            >
              {wordWrapOnSlashes(
                'github.com/areallylongstringwithnohyphens/plural/anotherlongstring'
              )}
            </A>
          </SidecarItem>
          <SidecarItem heading="Acked">
            01814fdf-09b2-4ea5-b2d3-277192808b28
          </SidecarItem>
          <SidecarItem heading="Last pinged">Jun 14, 2022 11:34 AM</SidecarItem>
        </Sidecar>
      </Div>
    </Div>
  )
}

export const Default = Template.bind({})

Default.args = {
  heading: 'Sidecar Title',
}
