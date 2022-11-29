// import React, { useContext, useState } from 'react'

// import {
//   TabContent,
//   TabHeader,
//   TabHeaderItem,
//   Tabs,
// } from 'forge-core'

// import { Box, Text } from 'grommet'

// import { Portal } from 'react-portal'

// import RangePicker from 'components/utils/RangePicker'

// import { LoopingLogo } from '../utils/AnimatedLogo'

// import { Display } from './Display'

// import { StatusIcon } from './StatusIcon'

// import { RunbookExecutions } from './RunbookExecutions'

// export const ActionContext = React.createContext({})

// function ActionContainer() {
//   const { setRef } = useContext(ActionContext)

//   return (
//     <Box
//       ref={setRef}
//       flex={false}
//     />
//   )
// }

// export function ActionPortal({ children }) {
//   const { ref } = useContext(ActionContext)

//   return (
//     <Portal node={ref}>
//       <Box pad={{ vertical: 'xsmall' }}>
//         {children}
//       </Box>
//     </Portal>
//   )
// }

// export function Runbook() {
//   const [ref, setRef] = useState(null)

//   if (!data) return <LoopingLogo dark />

//   return (
//     // eslint-disable-next-line react/jsx-no-constructed-context-values
//     <ActionContext.Provider value={{ ref, setRef }}>
//       <Box
//         fill
//         background="backgroundColor"
//       >
//         <Box
//           pad="small"
//           direction="row"
//           gap="small"
//           align="center"
//         >
//           <Box flex={false}>
//             <StatusIcon
//               status={runbook.status}
//               size={35}
//               innerSize={20}
//             />
//           </Box>
//           <Box fill="horizontal">
//             <Text
//               size="small"
//               weight="bold"
//             >{runbook.spec.name}
//             </Text>
//             <Text
//               size="small"
//               color="dark-3"
//             >{runbook.spec.description}
//             </Text>
//           </Box>
//           <Box flex={false}>
//             <RangePicker
//               duration={duration}
//               setDuration={setDuration}
//             />
//           </Box>
//           <ActionContainer />
//         </Box>
//         <Box fill>
//           <Tabs
//             defaultTab="runbook"
//             onTabChange={() => refetch()}
//           >
//             <TabHeader>
//               <TabHeaderItem name="runbook">
//                 <Text
//                   size="small"
//                   weight={500}
//                 >runbook
//                 </Text>
//               </TabHeaderItem>
//               <TabHeaderItem name="executions">
//                 <Text
//                   size="small"
//                   weight={500}
//                 >executions
//                 </Text>
//               </TabHeaderItem>
//             </TabHeader>
//             <TabContent name="runbook">
//               <Box
//                 style={{ overflow: 'auto' }}
//                 pad="small"
//                 fill
//               >
//                 <Display
//                   root={runbook.spec.display}
//                   data={runbook.data}
//                 />
//               </Box>
//             </TabContent>
//             <TabContent name="executions">
//               <RunbookExecutions
//                 runbook={runbook}
//                 loading={loading}
//                 fetchMore={fetchMore}
//               />
//             </TabContent>
//           </Tabs>
//         </Box>
//       </Box>
//     </ActionContext.Provider>
//   )
// }
