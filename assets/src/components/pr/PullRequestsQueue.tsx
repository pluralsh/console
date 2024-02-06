// import { SubTab, TabList, TabPanel } from '@pluralsh/design-system'
import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'

import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'

import LoadingIndicator from 'components/utils/LoadingIndicator'

import { PluralErrorBoundary } from 'components/cd/PluralErrorBoundary'
import { useCDEnabled } from 'components/cd/utils/useCDEnabled'

// const directory = [
//   {
//     path: PR_OUTSTANDING_REL_PATH,
//     label: 'Outstanding PRs',
//   },
//   {
//     path: PR_DEPENDENCIES_REL_PATH,
//     label: 'Dependency dashboard',
//   },
// ] as const satisfies Directory

export default function PullRequests() {
  // const theme = useTheme()

  const cdEnabled = useCDEnabled({ redirect: true })

  if (!cdEnabled) return null

  // const tabStateRef = useRef<any>(null)
  // const pathMatch = useMatch(`${PR_ABS_PATH}/:tab*`)
  // const tab = pathMatch?.params?.tab || ''
  // const currentTab = directory.find(({ path }) => path === tab)

  return (
    <ResponsivePageFullWidth
      scrollable={false}
      // headingContent={
      //   <div
      //     css={{
      //       display: 'flex',
      //       gap: theme.spacing.large,
      //       flexGrow: 1,
      //       width: '100%',
      //       justifyContent: 'space-between',
      //     }}
      //   >
      //     <TabList
      //       gap="xxsmall"
      //       stateRef={tabStateRef}
      //       stateProps={{
      //         orientation: 'horizontal',
      //         selectedKey: currentTab?.path,
      //       }}
      //     >
      //       {directory.map(({ label, path }) => (
      //         <LinkTabWrap
      //           subTab
      //           key={path}
      //           textValue={label}
      //           to={`${PR_ABS_PATH}/${path}`}
      //         >
      //           <SubTab
      //             key={path}
      //             textValue={label}
      //           >
      //             {label}
      //           </SubTab>
      //         </LinkTabWrap>
      //       ))}
      //     </TabList>
      //     {headerContent}
      //   </div>
      // }
    >
      <PluralErrorBoundary>
        {/* <TabPanel
          css={{ height: '100%' }}
          stateRef={tabStateRef}
        > */}
        <Suspense fallback={<LoadingIndicator />}>
          <Outlet />
        </Suspense>
        {/* </TabPanel> */}
      </PluralErrorBoundary>
    </ResponsivePageFullWidth>
  )
}
