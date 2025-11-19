import { Flex } from 'honorable'
import { useTheme } from 'styled-components'

import { Card, Code, WrapWithIf } from '..'

import {
  cCode,
  elixirCode,
  goCode,
  jsCode,
  rustCode,
  tfCode,
} from '../constants'

export default {
  title: 'Code',
  component: Code,
  argTypes: {
    title: {
      control: 'text',
    },
    showLineNumbers: {
      control: {
        type: 'boolean',
      },
    },
    showHeader: {
      options: [undefined, true, false],
      control: {
        type: 'select',
      },
    },
    onFillLevel: {
      options: [0, 1, 2, 3],
      control: {
        type: 'select',
        labels: {
          0: '0',
          1: '1',
          2: "2 - Shouldn't be used",
          3: "3 - Shouldn't be used",
        },
      },
    },
    height: {
      control: {
        type: 'number',
      },
    },
  },
}

function Template({ onFillLevel, ...args }: any) {
  return (
    <WrapWithIf
      condition={onFillLevel > 0}
      wrapper={
        <Card
          fillLevel={onFillLevel}
          padding="medium"
        />
      }
    >
      <Flex
        direction="column"
        gap="medium"
      >
        <Code
          language="javascript"
          width="600px"
          {...args}
        >
          {jsCode}
        </Code>
        <Code
          language="terraform"
          width="600px"
          height="200px"
          {...args}
        >
          {tfCode}
        </Code>
        <Code
          width="600px"
          height="100px"
          {...args}
        >
          {jsCode}
        </Code>
        <Code
          language="go"
          width="400px"
          {...args}
        >
          {goCode}
        </Code>
        <Code
          width="400px"
          language="js"
          {...args}
        >
          console.warn('test')
        </Code>
        <Code
          width="400px"
          {...args}
        >
          One line
        </Code>
        <Code
          width="400px"
          height="300px"
          {...args}
        >
          One line with `height` specified
        </Code>
        <Code
          width="400px"
          {...args}
        >
          {'Two lines\nTwo lines'}
        </Code>
        <Code
          width="400px"
          {...args}
        >
          {'Three lines\nThree lines\nThree lines'}
        </Code>
        <Code
          language="javascript"
          {...args}
        >
          {jsCode}
        </Code>
      </Flex>
    </WrapWithIf>
  )
}

const tabs = [
  {
    key: 'go',
    label: 'Go',
    language: 'golang',
    content: goCode,
  },
  {
    key: 'tf',
    label: 'Terraform',
    language: 'terraform',
    content: tfCode,
  },
  {
    key: 'js',
    label: 'Javascript',
    language: 'javascript',
    content: "const oneLine = 'Just one line'",
  },
  {
    key: 'elixir',
    label: 'Elixir',
    language: 'elixir',
    content: elixirCode,
  },
  {
    key: 'c',
    label: 'C',
    language: 'c',
    content: cCode,
  },
  {
    key: 'rust',
    label: 'Rust',
    language: 'rust',
    content: rustCode,
  },
]

function WithTabsTemplate({ onFillLevel, title, ...args }: any) {
  const theme = useTheme()

  return (
    <WrapWithIf
      condition={onFillLevel > 0}
      wrapper={
        <Card
          fillLevel={onFillLevel}
          padding="medium"
        />
      }
    >
      {' '}
      <Flex
        flexDirection="column"
        gap={theme.spacing.xxlarge}
        width="100%"
      >
        <Flex
          direction="column"
          gap="medium"
        >
          <Code
            title={title}
            tabs={tabs.slice(0, 3)}
            {...args}
          />
        </Flex>

        <Flex
          direction="column"
          gap="medium"
        >
          <Code
            title={title}
            tabs={tabs.slice(0, 3)}
            {...args}
          />
        </Flex>

        <Flex
          direction="column"
          gap="medium"
        >
          <Code
            title={title}
            tabs={tabs.slice(0, 6)}
            {...args}
          />
        </Flex>
      </Flex>
    </WrapWithIf>
  )
}

export const Default = Template.bind({})
Default.args = {
  title: '',
  showLineNumbers: true,
  showHeader: undefined,
}

export const WithTabs = WithTabsTemplate.bind({})
WithTabs.args = {
  title: 'This is an optional title',
  showLineNumbers: true,
  showHeader: undefined,
  onFillLevel: 0,
  height: 300,
}

const flowchartMermaid = `graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> E[Fix issue]
    E --> B
    C --> F[End]`

const sequenceMermaid = `sequenceDiagram
    participant User
    participant API
    participant Database
    
    User->>API: Request data
    API->>Database: Query
    Database-->>API: Return results
    API-->>User: Response`

const ganttMermaid = `gantt
    title Project Timeline
    dateFormat YYYY-MM-DD
    section Phase 1
    Task 1           :a1, 2024-01-01, 30d
    Task 2           :a2, after a1, 20d
    section Phase 2
    Task 3           :a3, 2024-02-15, 15d`
const bigMermaid = `flowchart LR
    A["Developer prepares new feature branch for the upcoming release.
    Adds unit and integration tests, reviews documentation, and ensures code quality standards are followed."]
    --> B["A Pull Request (PR) is created and submitted.
    Team reviews the PR for code consistency, security issues, and test coverage. Assigns reviewers as needed."]
    --> C["Automated CI/CD pipeline is triggered.
    Static code analysis for vulnerabilities, linting, and running all test suites before approvals are allowed."]
    --> D["Peer review process.
    Reviewers provide comments, suggest improvements, and may require changes before approving the PR for merge. If rejected, code is updated and resubmitted."]
    --> E["Once PR is approved, the code is merged into the main branch.
    Merge triggers a new, stricter pipeline that builds release artifacts, images, and runs e2e tests."]
    --> F["The build process generates container images.
    Container scans ensure no critical vulnerabilities exist before pushing to the image registry."]
    --> G["CD tools update Kubernetes manifests or Helm charts.
    Versioning and image digests are updated automatically, and change sets are prepared for deployment."]
    --> H["Deployment to staging environment.
    Kubernetes applies new manifests. Feature gates or canary releases may be enabled for sensitive changes."]
    --> I["Automated smoke and regression tests run on staging.
    If failures occur, notifications are sent, and the pipeline pauses for intervention; otherwise, approval is granted for production release."]
    --> J["Production deployment.
    Kubernetes deploys with rolling updates, monitoring tools check health status, and alerts are configured for error thresholds."]
    --> K["Post-deployment checks.
    System metrics and logs are reviewed, rollback mechanisms stay armed, and stakeholder communications are sent out."]`

function MermaidTemplate({ onFillLevel, ...args }: any) {
  return (
    <WrapWithIf
      condition={onFillLevel > 0}
      wrapper={
        <Card
          fillLevel={onFillLevel}
          padding="medium"
        />
      }
    >
      <Flex
        direction="column"
        gap="medium"
      >
        <Code
          language="mermaid"
          {...args}
        >
          {`graph LR
              A[Start] --> B[Process]
              B --> C[End]`}
        </Code>
        <Code
          language="mermaid"
          {...args}
        >
          {flowchartMermaid}
        </Code>
        <Code
          language="mermaid"
          {...args}
        >
          {sequenceMermaid}
        </Code>
        <Code
          language="mermaid"
          {...args}
        >
          {ganttMermaid}
        </Code>
        <Code
          language="mermaid"
          {...args}
        >
          {bigMermaid}
        </Code>
      </Flex>
    </WrapWithIf>
  )
}

export const Mermaid = MermaidTemplate.bind({})
Mermaid.args = {
  title: '',
  showLineNumbers: false,
  showHeader: undefined,
  onFillLevel: 0,
}

const mermaidTabs = [
  {
    key: 'flowchart',
    label: 'Flowchart',
    language: 'mermaid',
    content: flowchartMermaid,
  },
  {
    key: 'sequence',
    label: 'Sequence',
    language: 'mermaid',
    content: sequenceMermaid,
  },
  {
    key: 'gantt',
    label: 'Gantt',
    language: 'mermaid',
    content: ganttMermaid,
  },
]

function MermaidWithTabsTemplate({ onFillLevel, title, ...args }: any) {
  const theme = useTheme()

  return (
    <WrapWithIf
      condition={onFillLevel > 0}
      wrapper={
        <Card
          fillLevel={onFillLevel}
          padding="medium"
        />
      }
    >
      <Flex
        flexDirection="column"
        gap={theme.spacing.xxlarge}
        width="100%"
      >
        <Flex
          direction="column"
          gap="medium"
        >
          <Code
            title={title}
            tabs={mermaidTabs}
            width="800px"
            height="400px"
            {...args}
          />
        </Flex>
      </Flex>
    </WrapWithIf>
  )
}

export const MermaidWithTabs = MermaidWithTabsTemplate.bind({})
MermaidWithTabs.args = {
  title: 'Mermaid Diagrams',
  showLineNumbers: false,
  showHeader: undefined,
  onFillLevel: 0,
}
