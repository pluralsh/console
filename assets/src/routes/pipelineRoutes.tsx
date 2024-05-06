import { Navigate, Route } from 'react-router-dom'
import PipelineJob from 'components/cd/pipelines/job/PipelineJob'
import PipelineJobLogs from 'components/cd/pipelines/job/PipelineJobLogs'
import PipelineJobPods from 'components/cd/pipelines/job/PipelineJobPods'
import PipelineJobStatus from 'components/cd/pipelines/job/PipelineJobStatus'
import PipelineJobSpecs from 'components/cd/pipelines/job/PipelineJobSpecs'

import PipelineDetails from 'components/cd/pipelines/PipelineDetails'

import { PipelineContextDetails } from 'components/cd/pipelines/context/PipelineContextDetails'

import { PIPELINES_REL_PATH } from './cdRoutesConsts'

export const pipelineRoutes = [
  <Route
    key="pipeline-main"
    path={`${PIPELINES_REL_PATH}/:pipelineId`}
    element={<PipelineDetails />}
  />,
  <Route
    key="pipeline-context"
    path={`${PIPELINES_REL_PATH}/:pipelineId/context/:contextId`}
    element={<PipelineContextDetails />}
  />,
  <Route
    key="pipeline-jobs"
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
      element={<PipelineJobStatus />}
    />
    <Route
      path="specs/:tab?"
      element={<PipelineJobSpecs />}
    />
  </Route>,
]
