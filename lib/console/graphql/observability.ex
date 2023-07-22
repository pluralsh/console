defmodule Console.GraphQl.Observability do
  use Console.GraphQl.Schema.Base
  alias Console.GraphQl.Resolvers.Observability

  enum :autoscaling_target do
    value :statefulset
    value :deployment
  end

  input_object :label_input do
    field :name,  :string
    field :value, :string
  end

  object :dashboard do
    field :id,   non_null(:string), resolve: fn %{metadata: %{name: n}}, _, _ -> {:ok, n} end
    field :spec, non_null(:dashboard_spec)
  end

  object :dashboard_spec do
    field :name,        :string
    field :description, :string
    field :timeslices,  list_of(:string)
    field :labels,      list_of(:dashboard_label)
    field :graphs,      list_of(:dashboard_graph)
  end

  object :dashboard_label do
    field :name,   non_null(:string)
    field :values, list_of(:string)
  end

  object :dashboard_graph do
    field :name,    non_null(:string)
    field :queries, list_of(:dashboard_metric)
    field :format,  :string
  end

  object :dashboard_metric do
    field :legend, :string
    field :query,  :string
    field :results, list_of(:metric_result)
  end

  object :metric_result do
    field :timestamp, :integer, resolve: fn %{timestamp: ts}, _, _ -> {:ok, ceil(ts)} end
    field :value,     :string
  end

  object :metric_response do
    field :metric, :map
    field :values, list_of(:metric_result), resolve: fn %{values: vals}, _, _ ->
      {:ok, Enum.map(vals, fn [ts, val] -> %{timestamp: ts, value: val} end)}
    end
  end

  object :log_stream do
    field :stream, :map
    field :values, list_of(:metric_result)
  end

  object :observability_queries do
    field :dashboards, list_of(:dashboard) do
      middleware Authenticated
      arg :repo, non_null(:string)
      middleware Rbac, perm: :read, arg: :repo

      safe_resolve &Observability.resolve_dashboards/2
    end

    field :dashboard, :dashboard do
      middleware Authenticated
      arg :repo,   non_null(:string)
      arg :name,   non_null(:string)
      arg :step,   :string
      arg :offset, :integer
      arg :labels, list_of(:label_input)
      middleware Rbac, perm: :read, arg: :repo

      safe_resolve &Observability.resolve_dashboard/2
    end

    field :metric, list_of(:metric_response) do
      middleware Authenticated
      arg :query,  non_null(:string)
      arg :offset, :integer
      arg :step,   :string

      safe_resolve &Observability.resolve_metric/2
    end

    field :logs, list_of(:log_stream) do
      middleware Authenticated
      arg :query, non_null(:string)
      arg :start, :long
      arg :end,   :long
      arg :limit, non_null(:integer)

      safe_resolve &Observability.resolve_logs/2
    end

    field :scaling_recommendation, :vertical_pod_autoscaler do
      middleware Authenticated
      arg :kind,      non_null(:autoscaling_target)
      arg :namespace, non_null(:string)
      arg :name,      non_null(:string)

      safe_resolve &Observability.resolve_scaling_recommendation/2
    end
  end
end
