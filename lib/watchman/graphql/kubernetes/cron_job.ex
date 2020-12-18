defmodule Watchman.GraphQl.Kubernetes.CronJob do
  use Watchman.GraphQl.Schema.Base
  import Watchman.GraphQl.Kubernetes.Base
  alias Watchman.GraphQl.Resolvers.Kubernetes

  object :cron_job do
    field :metadata, non_null(:metadata)
    field :status,   non_null(:cron_status)
    field :spec,     non_null(:cron_spec)

    field :raw,    non_null(:string), resolve: fn model, _, _ -> encode(model) end
    field :events, list_of(:event), resolve: fn model, _, _ -> Kubernetes.list_events(model) end
    field :jobs,   list_of(:job), resolve: fn
      %{metadata: %{uid: uid} = meta}, _, _ ->
        with {:ok, jobs} <- Kubernetes.list_jobs(meta),
          do: {:ok, Enum.filter(jobs, &Kubernetes.has_owner?(&1, uid))}
    end
  end

  object :cron_status do
    field :active,              list_of(:job_reference)
    field :last_schedule_time, :string
  end

  object :job_reference do
    field :name,      non_null(:string)
    field :namespace, non_null(:string)
  end

  object :cron_spec do
    field :schedule,           non_null(:string)
    field :suspend,            :boolean
    field :concurrency_policy, :string
  end
end