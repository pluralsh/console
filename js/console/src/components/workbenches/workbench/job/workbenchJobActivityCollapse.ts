import { WorkbenchJobActivityStatus } from 'generated/graphql'

export const isActivityTerminal = (
  status: Nullable<WorkbenchJobActivityStatus>
) =>
  status === WorkbenchJobActivityStatus.Successful ||
  status === WorkbenchJobActivityStatus.Failed ||
  status === WorkbenchJobActivityStatus.Rejected
