import { useCallback } from 'react'

import { useCustomEventListener } from './useCustomEventListener'

export const INTERCOM_UPDATE_UNREAD_COUNT_EVENT_TYPE =
  'pluralIntercomUpdateCount'
type IntercomUpdateUnreadProps = {
  count?: number
}
export type IntercomUpdateUnreadEvent = CustomEvent<IntercomUpdateUnreadProps>
export const IntercomUpdateUnreadEvent = CustomEvent<IntercomUpdateUnreadProps>

export function updateIntercomUnread(unreadCount: number) {
  const event = new IntercomUpdateUnreadEvent(
    INTERCOM_UPDATE_UNREAD_COUNT_EVENT_TYPE,
    {
      detail: { count: unreadCount },
    }
  )

  window.dispatchEvent(event)
}

export function useIntercomUpdateUnread(cb: (unread: number) => void) {
  useCustomEventListener<IntercomUpdateUnreadEvent>(
    INTERCOM_UPDATE_UNREAD_COUNT_EVENT_TYPE,
    useCallback(
      (e) => {
        const { count } = e.detail || {}

        if (typeof count === 'number' && count >= 0) {
          cb(count)
        }
      },
      [cb]
    )
  )
}
