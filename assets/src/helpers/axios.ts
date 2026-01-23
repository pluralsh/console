import { Client, createClient } from '../generated/kubernetes/client'
import { fetchToken } from './auth'

const clients = new Map<string, Client>()

export const AxiosInstance = (clusterID: string) => {
  if (!clients.has(clusterID)) {
    const client = createClient()

    client.instance.interceptors.request.use((config) => {
      config.headers.Authorization = `Bearer plrl:${clusterID}:${fetchToken()}`
      return config
    })

    clients.set(clusterID, client)
  }

  return clients.get(clusterID)!
}
