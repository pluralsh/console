import { Client, createClient } from '../generated/kubernetes/client'
import { fetchToken } from './auth'

const clients = new Map<string, Client>()

export const getAxiosInstance = (clusterID: string) => {
  if (!clients.has(clusterID)) {
    clients.set(
      clusterID,
      createClient({
        headers: {
          Authorization: `Bearer plrl:${clusterID}:${fetchToken()}`,
        },
      })
    )
  }

  return clients.get(clusterID)!
}
