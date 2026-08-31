import { RunJobLogs } from 'components/utils/run-job/RunJobLogs'
import { RunJobPods } from 'components/utils/run-job/RunJobPods'
import { RunJobSpecs } from 'components/utils/run-job/RunJobSpecs'
import { RunJobStatus } from 'components/utils/run-job/RunJobStatus'
import { Navigate, Route } from 'react-router-dom'

export const jobRoutes = [
  <Route
    index
    element={
      <Navigate
        replace
        to="logs"
      />
    }
  />,
  <Route
    path="logs"
    element={<RunJobLogs />}
  />,
  <Route
    path="pods"
    element={<RunJobPods />}
  />,
  <Route
    path="status"
    element={<RunJobStatus />}
  />,
  <Route
    path="specs/:tab?"
    element={<RunJobSpecs />}
  />,
]
