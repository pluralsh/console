defmodule Console.GraphQl.Observability do
  use Console.GraphQl.Schema.Base
  alias Console.GraphQl.Resolvers.Observability
  alias Console.Middleware.ObservabilityClient

  enum :autoscaling_target do
    value :statefulset
    value :deployment
  end

  input_object :label_input do
    field :name,  :string
    field :value, :string
  end

  input_object :log_time_range do
    field :before,   :datetime
    field :after,    :datetime
    field :duration, :string
    field :reverse,  :boolean
  end

  input_object :log_facet_input do
    field :key,   non_null(:string)
    field :value, non_null(:string)
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

  object :metric_response do
    field :metric, :map
    field :values, list_of(:metric_result), resolve: fn
      %{values: [ts, val]}, _, _ when is_float(ts) or is_integer(ts) ->
        {:ok, [%{timestamp: ts, value: val}]}
      %{values: vals}, _, _ when is_list(vals) ->
        {:ok, Enum.map(vals, fn [ts, val] -> %{timestamp: ts, value: val} end)}
      _, _, _ -> {:ok, []}
    end
  end

  object :metric_point_response do
    field :metric, :map
    field :value, :metric_result, resolve: fn
      %{value: [ts, val]}, _, _ when is_float(ts) or is_integer(ts) ->
        {:ok, %{timestamp: ts, value: val}}
      _, _, _ -> {:ok, nil}
    end
  end

  object :log_line do
    field :timestamp, :datetime
    field :log,       :string
    field :facets,    list_of(:log_facet)
  end

  object :log_facet do
    field :key,   non_null(:string)
    field :value, :string
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

      arg :query,      non_null(:string)
      arg :offset,     :integer
      arg :step,       :string
      arg :cluster_id, :id

      middleware ObservabilityClient, :prometheus
      safe_resolve &Observability.resolve_metric/2
    end

    field :log_aggregation, list_of(:log_line) do
      middleware Authenticated
      arg :service_id, :id
      arg :cluster_id, :id
      arg :query,      :string
      arg :time,       :log_time_range
      arg :limit,      :integer
      arg :facets,     list_of(:log_facet_input)

      resolve &Observability.list_logs/2
    end

    field :logs, list_of(:log_stream) do
      middleware Authenticated

      arg :query,      non_null(:string)
      arg :start,      :long
      arg :end,        :long
      arg :limit,      non_null(:integer)
      arg :cluster_id, :id

      middleware ObservabilityClient, :loki
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
