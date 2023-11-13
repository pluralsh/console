import { Code } from '@pluralsh/design-system'

const scaffoldTabs = [
  {
    key: 'nodejs',
    label: 'Node.js',
    language: 'sh',
    content: `plural scaffold --type nodejs --name <my-service>`,
  },
  {
    key: 'rails',
    label: 'Rails',
    language: 'sh',
    content: `plural scaffold --type rails --name <my-service>`,
  },
  {
    key: 'springboot',
    label: 'Spring boot',
    language: 'sh',
    content: `plural scaffold --type springboot --name <my-service>`,
  },
  {
    key: 'django',
    label: 'Django',
    language: 'sh',
    content: `plural scaffold --type django --name <my-service>`,
  },
]

export function GitScaffoldTabs() {
  return <Code tabs={scaffoldTabs} />
}
