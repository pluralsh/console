import {
  TreeNav,
  TreeNavEntry,
  WrapWithIf,
  getBarePathFromPath,
  removeTrailingSlashes,
} from '@pluralsh/design-system'
import isEmpty from 'lodash/isEmpty'
import { useDocPageContext } from 'components/contexts/DocPageContext'

export function SideNavEntries({
  directory,
  pathname,
  pathPrefix,
  root = true,
  docPageContext,
}: {
  directory: any[]
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
      {directory.map(({ label, path, subpaths, type, ...props }) => {
        const currentPath =
          removeTrailingSlashes(getBarePathFromPath(pathname)) || ''
        const fullPath = `${pathPrefix}/${removeTrailingSlashes(path) || ''}`
        const hashlessPath = fullPath.split('#')[0]
        const isInCurrentPath = currentPath.startsWith(hashlessPath)
        const docPageRootHash = props?.headings?.[0]?.id || ''
        const active =
          type === 'docPage'
            ? isInCurrentPath &&
              (docPageContext?.selectedHash === docPageRootHash ||
                !docPageContext?.selectedHash)
            : type === 'docPageHash'
            ? isInCurrentPath && docPageContext?.selectedHash === props.id
            : isInCurrentPath

        return (
          <TreeNavEntry
            key={fullPath}
            href={path === 'docs' ? undefined : fullPath}
            label={label}
            active={active}
            {...(type === 'docPageHash' && props.id
              ? {
                  onClick: () => {
                    docPageContext?.scrollToHash?.(props.id)
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
            {!isEmpty(subpaths) ? (
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
