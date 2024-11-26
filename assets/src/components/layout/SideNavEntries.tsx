import {
  MarkdocHeading,
  TreeNav,
  TreeNavEntry,
  WrapWithIf,
  getBarePathFromPath,
  removeTrailingSlashes,
} from '@pluralsh/design-system'
import isEmpty from 'lodash/isEmpty'
import { useDocPageContext } from 'components/contexts/DocPageContext'
import { ReactNode } from 'react'
import { SetOptional } from 'type-fest'

export type DirectoryEntry = {
  enabled?: boolean
  label: ReactNode
  path: string
  subpaths?: Nullable<Nullable<SetOptional<DirectoryEntry, 'enabled'>>[]>
  type?: string
  headings?: MarkdocHeading[]
  id?: string
}
export type Directory = Nullable<DirectoryEntry>[]

export function SideNavEntries({
  directory,
  pathname,
  pathPrefix,
  root = true,
  docPageContext,
}: {
  directory: Directory
  pathname: string
  pathPrefix: string
  root?: boolean
  docPageContext?: ReturnType<typeof useDocPageContext>
}) {
  return (
    <WrapWithIf
      condition={root}
      wrapper={<TreeNav />}
    >
      {directory.map((entry) => {
        if (!entry || entry.enabled === false) {
          return null
        }
        const { label, path, subpaths, type, id, headings } = entry
        const currentPath =
          removeTrailingSlashes(getBarePathFromPath(pathname)) || ''
        const fullPath = `${pathPrefix}/${removeTrailingSlashes(path) || ''}`
        const hashlessPath = fullPath.split('#')[0]
        const isInCurrentPath = currentPath.startsWith(hashlessPath)
        const docPageRootHash = headings?.[0]?.id || ''
        const active =
          type === 'docPage'
            ? isInCurrentPath &&
              (docPageContext?.selectedHash === docPageRootHash ||
                !docPageContext?.selectedHash)
            : type === 'docPageHash'
              ? isInCurrentPath && docPageContext?.selectedHash === id
              : isInCurrentPath

        return (
          <TreeNavEntry
            key={fullPath}
            href={path === 'docs' ? undefined : fullPath}
            label={label}
            active={active}
            {...(type === 'docPageHash' && id
              ? {
                  onClick: () => {
                    docPageContext?.scrollToHash?.(id)
                  },
                }
              : type === 'docPage'
                ? {
                    onClick: () => {
                      docPageContext?.scrollToHash?.(docPageRootHash)
                    },
                  }
                : {})}
          >
            {subpaths && !isEmpty(subpaths) ? (
              <SideNavEntries
                directory={subpaths}
                pathname={pathname}
                pathPrefix={pathPrefix}
                root={false}
              />
            ) : null}
          </TreeNavEntry>
        )
      })}
    </WrapWithIf>
  )
}
