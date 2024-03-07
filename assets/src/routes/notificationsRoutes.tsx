import { type RouteObject } from 'react-router'
import { Navigate } from 'react-router-dom'

import Notifications from 'components/notifications/Notifications'
import NotificationRouters from 'components/notifications/routers/NotificationRouters'
import NotificationSinks from 'components/notifications/sinks/NotificationSinks'

import { RequireCdEnabled } from './cdRoutes'

import {
  NOTIFICATIONS_DEFAULT_REL_PATH,
  NOTIFICATIONS_REL_PATH,
  NOTIFICATIONS_ROUTERS_REL_PATH,
  NOTIFICATIONS_SINKS_REL_PATH,
} from './notificationsRoutesConsts'

export const notificationsRoutes = [
  {
    path: NOTIFICATIONS_REL_PATH,
    element: <RequireCdEnabled />,
    children: [
      {
        index: true,
        element: <Navigate to={NOTIFICATIONS_DEFAULT_REL_PATH} />,
      },
      {
        element: <Notifications />,
        children: [
          {
            path: NOTIFICATIONS_ROUTERS_REL_PATH,
            element: <NotificationRouters />,
          },
          {
            path: NOTIFICATIONS_SINKS_REL_PATH,
            element: <NotificationSinks />,
          },
        ],
      },
    ],
  },
] as const satisfies RouteObject[]
