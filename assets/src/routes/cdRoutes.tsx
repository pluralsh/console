import ContinuousDeployment from 'components/cd/ContinuousDeployment'
import Clusters from 'components/cd/clusters/Clusters'
import GitRepositories from 'components/cd/repos/GitRepositories'
import Services from 'components/cd/Services'
import Pipelines from 'components/cd/Pipelines'
import Providers from 'components/cd/Providers'
import { Navigate, Route } from 'react-router-dom'

export const CD_BASE_PATH = 'cd'

export const cdRoutes = [
  /* Root */
  <Route
    path={CD_BASE_PATH}
    loader={() => {
      console.log('plural wrapper loader')

      return {}
    }}
    element={<ContinuousDeployment />}
  >
    <Route
      index
      element={
        <Navigate
          replace
          to="clusters"
        />
      }
    />
    <Route
      path="clusters"
      element={<Clusters />}
    />
    <Route
      path="services"
      element={<Services />}
    />
    <Route
      path="pipelines"
      element={<Pipelines />}
    />
    <Route
      path="git"
      element={<GitRepositories />}
    />
    <Route
      path="providers"
      element={<Providers />}
    />
  </Route>,
]
