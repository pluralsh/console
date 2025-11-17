import { Div } from 'honorable'
import { type ComponentProps, useEffect, useState } from 'react'

import { useNavigationContext } from '../components/contexts/NavigationContext'

import { TreeNav, TreeNavEntry } from '../components/TreeNavigation'

import { NavContextProviderStub } from './NavigationContextStub'

export default {
  title: 'Tree Navigation',
  component: TreeNav,
  argTypes: {},
}

const getDirectory = () => [
  { path: 'dashboards', label: 'Dashboards', enabled: true },
  { path: 'runbooks', label: 'Runbooks', enabled: true },
  {
    path: 'components',
    label: 'Components',
    enabled: true,
  },
  { path: 'logs', label: 'Logs', enabled: true },
  { path: 'cost', label: 'Cost analysis', enabled: true },
  { path: 'oidc', label: 'User management', enabled: true },
  {
    path: 'config',
    label: 'Configuration',
    enabled: true,
  },
  {
    label: 'Airbyte docs',
    enabled: true,
    matchPath: (path: string) => path.startsWith('docs'),
    subPaths: [
      {
        path: 'docs/page1',
        label: 'Page 1',
      },
      {
        path: 'docs/page2',
        label: 'Page 2',
      },
      {
        path: 'docs/page3',
        label: 'Page 3',
      },
      {
        path: 'docs/page4',
        label: 'Page 4',
      },
    ],
  },
]

const loadSubEntriesOf = async (
  path: string
): Promise<{ id: string; label: string }[] | null> => {
  await new Promise((resolve) => {
    setTimeout(resolve, 500)
  })

  const ret =
    {
      'docs/page1': [
        {
          id: '#id1',
          label: 'A longer title',
        },
        {
          id: '#id2',
          label: 'Short one',
        },
        {
          id: '#id3',
          label: 'A yet even longer title',
        },
      ],
      'docs/page2': [
        {
          id: '#id2',
          label: 'Short one',
        },
        {
          id: '#id3',
          label: 'A yet even longer title',
        },
      ],
      'docs/page3': [
        {
          id: '#id3',
          label: 'A yet even longer title',
        },
      ],
      'docs/page4': [
        {
          id: '#id1',
          label: 'A longer title',
        },
        {
          id: '#id3',
          label: 'A yet even longer title',
        },
      ],
    }[path] || null

  return ret
}

function NavEntryDoc({
  path,
  ...props
}: { path: string } & Omit<ComponentProps<typeof TreeNavEntry>, 'active'>) {
  const { usePathname, useNavigate } = useNavigationContext()
  const navigate = useNavigate()
  const currentPath = usePathname()

  const [loadingSubPaths, setLoadingSubPaths] = useState(false)
  const [subPaths, setSubPaths] = useState<
    { id: string; label: string }[] | null
  >()
  const [currentHash, setCurrentHash] = useState<string | undefined>()

  const isCurrentPath = currentPath.startsWith(path)

  // Simulate loading subpaths after selection
  useEffect(() => {
    if (isCurrentPath) {
      let isSubscribed = true

      setSubPaths(null)
      loadSubEntriesOf(path).then((subPaths) => {
        if (isSubscribed) {
          setSubPaths(subPaths)
          setLoadingSubPaths(false)
        }
      })

      setLoadingSubPaths(true)

      return () => {
        isSubscribed = false
        setLoadingSubPaths(false)
        setSubPaths(null)
      }
    }
  }, [path, isCurrentPath])

  useEffect(() => {
    if (!subPaths) {
      if (currentHash) {
        setCurrentHash(null)
      }
    } else if (subPaths.length > 0 && !currentHash) {
      setCurrentHash(subPaths[0].id)
    }
  }, [currentHash, subPaths])

  return (
    <TreeNavEntry
      active={isCurrentPath}
      loading={loadingSubPaths}
      onClick={() => navigate(path)}
      {...props}
    >
      {subPaths?.map((subEntry) => (
        <TreeNavEntry
          key={subEntry.id}
          label={subEntry.label}
          active={currentHash === subEntry.id}
          onClick={() => {
            setCurrentHash(subEntry.id)
          }}
        />
      ))}
    </TreeNavEntry>
  )
}

function TemplateInner() {
  const { usePathname, useNavigate } = useNavigationContext()
  const navigate = useNavigate()
  const currentPath = usePathname()

  return (
    <Div maxWidth={200}>
      <TreeNav>
        {getDirectory().map((entry) => {
          const isExactCurrentPath = currentPath === entry.path

          return (
            <TreeNavEntry
              key={entry.path}
              label={entry.label}
              onClick={() => {
                if (entry.path) {
                  navigate(entry.path)
                }
              }}
              active={isExactCurrentPath}
            >
              {entry.subPaths?.map((subEntry) => (
                <NavEntryDoc
                  key={subEntry.path}
                  path={subEntry.path}
                  label={subEntry.label}
                />
              ))}
            </TreeNavEntry>
          )
        })}
      </TreeNav>
    </Div>
  )
}

function Template() {
  return (
    <NavContextProviderStub>
      <TemplateInner />
    </NavContextProviderStub>
  )
}

export const Default = Template.bind({})
Default.args = {}
