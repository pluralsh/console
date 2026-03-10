import { useState } from 'react'

import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { ChatProviderConnection } from 'generated/graphql'
import { ChatConnectionsList } from './ChatConnectionsList'
import { ChatConnectionEditOrCreate } from './ChatConnectionEditOrCreate'

export const CHAT_CONNECTION_CREATE_ID_KEY = 'create-chat-connection' as const

export type ChatConnectionEditT =
  | ChatProviderConnection
  | typeof CHAT_CONNECTION_CREATE_ID_KEY

export function GlobalSettingsChatConnections() {
  const [connectionEdit, setConnectionEdit] =
    useState<ChatConnectionEditT | null>(null)

  return (
    <ScrollablePage heading="Chat connections">
      {connectionEdit ? (
        <ChatConnectionEditOrCreate
          connection={connectionEdit}
          setConnectionEdit={setConnectionEdit}
        />
      ) : (
        <ChatConnectionsList setConnectionEdit={setConnectionEdit} />
      )}
    </ScrollablePage>
  )
}
