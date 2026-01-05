import axios, { AxiosInstance } from 'axios'
import { fetchToken } from './auth'

const clients = new Map<string, AxiosInstance>()
let currentClusterId: string | null = null

export const setClusterId = (clusterId: string | null) => {
  currentClusterId = clusterId
}

const createClient = (clusterId: string) => {
  const instance = axios.create()

  instance.interceptors.request.use((config) => {
    const token = fetchToken()

    if (token) {
      config.headers.Authorization = `Bearer plrl:${clusterId}:${token}`
    }

    return config
  })

  return instance
}

export const getAxiosInstance = () => {
  if (!currentClusterId) {
    return axios.create()
  }

  if (!clients.has(currentClusterId)) {
    clients.set(currentClusterId, createClient(currentClusterId))
  }

  return clients.get(currentClusterId)!
}
