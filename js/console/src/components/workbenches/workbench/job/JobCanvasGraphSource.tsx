import { ReactNode } from 'react'
import { DashboardGraphSourceContext } from '../monitoring/DashboardGraphSource'
import type { JobCanvasGraphQueries } from './useJobCanvasGraphData'

/** Serves a job canvas's dashboard panels from the job's stored tool queries. */
export function JobCanvasGraphSource({
  jobId,
  queries,
  children,
}: JobCanvasGraphQueries & { children: ReactNode }) {
  return (
    <DashboardGraphSourceContext
      value={{ job: { jobId, queries }, readOnly: true }}
    >
      {children}
    </DashboardGraphSourceContext>
  )
}
