import { Navigate, Route } from 'react-router-dom'

import Kubernetes from '../components/kubernetes/Kubernetes'
import Workloads from '../components/kubernetes/Workloads'
import Services from '../components/kubernetes/Services'
import Storage from '../components/kubernetes/Storage'
import Configuration from '../components/kubernetes/Configuration'

import {
  CONFIGURATION_REL_PATH,
  KUBERNETES_ABS_PATH,
  SERVICES_REL_PATH,
  STORAGE_REL_PATH,
  WORKLOADS_REL_PATH,
} from './kubernetesRoutesConsts'

export const kubernetesRoutes = [
  <Route
    path={KUBERNETES_ABS_PATH}
    element={<Kubernetes />}
  >
    <Route
      index
      element={
        <Navigate
          replace
          to={WORKLOADS_REL_PATH}
        />
      }
    />
    <Route
      path={WORKLOADS_REL_PATH}
      element={<Workloads />}
    />
    <Route
      path={SERVICES_REL_PATH}
      element={<Services />}
    />
    <Route
      path={STORAGE_REL_PATH}
      element={<Storage />}
    />
    <Route
      path={CONFIGURATION_REL_PATH}
      element={<Configuration />}
    />
  </Route>,
]
