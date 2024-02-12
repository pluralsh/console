defmodule Console.GraphQl.Kubernetes.Job do
  use Console.GraphQl.Schema.Base
  import Console.GraphQl.Kubernetes.Base
  alias Console.GraphQl.Resolvers.Kubernetes

  object :job do
    field :metadata, non_null(:metadata)
    field :status,   non_null(:job_status)
    field :spec,     non_null(:job_spec)

    field :raw,    non_null(:string), resolve: fn model, _, _ -> encode(model) end
    field :events, list_of(:event), resolve: fn model, _, _ -> Kubernetes.list_events(model) end
    field :pods,   list_of(:pod) do
      resolve fn %{metadata: metadata, spec: %{selector: selector}}, _, _ ->
        Kubernetes.list_pods(metadata, selector)
      end
      middleware ErrorHandler
    end

    field :logs, list_of(:string) do
      arg :container,     non_null(:string)
      arg :since_seconds, non_null(:integer)

      resolve &Kubernetes.read_job_logs/3
      middleware ErrorHandler
    end
  end

  object :job_status do
    field :active,          :integer
    field :completion_time, :string
    field :start_time,      :string
    field :succeeded,       :integer
    field :failed,          :integer
  end

  object :job_spec do
    field :backoff_limit,           :integer
    field :parallelism,             :integer
    field :active_deadline_seconds, :integer
  end
end
