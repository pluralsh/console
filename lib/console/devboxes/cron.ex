defmodule Console.Devboxes.Cron do
  @moduledoc """
  Scheduled devbox maintenance, wired in `Console.Cron.Scheduler`.
  """
  require Logger
  alias Console.{Devboxes, WorkloadIdentity}
  alias Console.Devboxes.AgentCredentials

  @doc "Completes instances suspended longer than their box's `completeAfter`"
  def complete_stale_instances() do
    completed = Devboxes.complete_stale_instances()
    Logger.info("completed #{length(completed)} stale devbox instances")
  end

  @doc "Runs a scheduled key rotation step for every enabled workload identity issuer"
  def rotate_workload_identity_keys(), do: WorkloadIdentity.rotate_all()

  @doc "Warns owners of agent subscription credentials expiring within 30 and 7 days"
  def warn_expiring_credentials(), do: AgentCredentials.warn_expiring()
end
