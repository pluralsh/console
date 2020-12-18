defmodule Watchman.GraphQl.Kubernetes.Job do
  use Watchman.GraphQl.Schema.Base
  import Watchman.GraphQl.Kubernetes.Base
  alias Watchman.GraphQl.Resolvers.Kubernetes

  object :job do
    field :metadata, non_null(:metadata)
    field :status,   non_null(:job_status)
    field :spec,     non_null(:job_spec)

    field :raw,    non_null(:string), resolve: fn model, _, _ -> encode(model) end
    field :events, list_of(:event), resolve: fn model, _, _ -> Kubernetes.list_events(model) end
    field :pods, list_of(:pod), resolve: fn
      %{metadata: metadata, spec: %{selector: selector}}, _, _ ->
        Kubernetes.list_pods(metadata, selector)
    end
  end

  object :job_status do
    field :active, :integer
    field :completion_time, :string
    field :start_time, :string
    field :succeeded, :integer
    field :failed, :integer
  end

  object :job_spec do
    field :backoff_limit,           :integer
    field :parallelism,             :integer
    field :active_deadline_seconds, :integer
  end
end