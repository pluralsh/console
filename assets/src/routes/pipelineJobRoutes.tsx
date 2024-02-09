import { Navigate, Route } from 'react-router-dom'
import PipelineJob from 'components/cd/pipelines/job/PipelineJob'
import PipelineJobLogs from 'components/cd/pipelines/job/PipelineJobLogs'
import PipelineJobPods from 'components/cd/pipelines/job/PipelineJobPods'

import { PIPELINES_REL_PATH } from './cdRoutesConsts'

export const pipelineJobRoutes = (
  <Route
    path={`${PIPELINES_REL_PATH}/jobs/:jobId`}
    element={<PipelineJob />}
  >
    <Route
      index
      element={
        <Navigate
          replace
          to="logs"
        />
      }
    />
    <Route
      path="logs"
      element={<PipelineJobLogs />}
    />
    <Route
      path="pods"
      element={<PipelineJobPods />}
    />
    <Route
      path="status"
      element={<PipelineJobLogs />}
    />
    <Route
      path="specs"
      element={<PipelineJobLogs />}
    />
  </Route>
)
