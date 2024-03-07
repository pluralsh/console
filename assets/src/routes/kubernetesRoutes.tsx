import { Navigate, Route } from 'react-router-dom'

import Workloads from '../components/kubernetes/Workloads'

import Kubernetes from '../components/kubernetes/Kubernetes'

import Services from '../components/kubernetes/Services'

import {
  KUBERNETES_ABS_PATH,
  SERVICES_REL_PATH,
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
  </Route>,
]
