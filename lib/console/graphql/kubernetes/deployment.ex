defmodule Console.GraphQl.Kubernetes.Deployment do
  use Console.GraphQl.Schema.Base
  import Console.GraphQl.Kubernetes.Base
  alias Console.GraphQl.Resolvers.Kubernetes
  alias Kazan.Models.Apimachinery.Meta.V1.{LabelSelector, LabelSelectorRequirement}

  object :deployment do
    field :metadata, non_null(:metadata)
    field :status,   non_null(:deployment_status)
    field :spec,     non_null(:deployment_spec)

    field :pods, list_of(:pod), resolve: fn
      %{metadata: metadata, spec: %{selector: selector}}, _, _ ->
        Kubernetes.list_pods(metadata, selector)
    end

    field :raw,    non_null(:string), resolve: fn model, _, _ -> encode(model) end
    field :events, list_of(:event), resolve: fn model, _, _ -> Kubernetes.list_events(model) end
  end

  object :replica_set do
    field :metadata, non_null(:metadata)
    field :spec, non_null(:replica_set_spec)
    field :status, non_null(:replica_set_status)

    field :pods, list_of(:pod), resolve: fn
      %{metadata: metadata, spec: %{selector: selector}}, _, _ ->
        Kubernetes.list_pods(metadata, selector)
    end

    field :raw, non_null(:string), resolve: fn model, _, _ -> encode(model) end
  end

  object :deployment_status do
    field :available_replicas,   :integer
    field :replicas,             :integer
    field :ready_replicas,       :integer
    field :unavailable_replicas, :integer
    field :conditions,           list_of(:status_condition)
  end

  object :deployment_spec do
    field :replicas, :integer
    field :selector, :map, resolve: fn spec, _, _ -> {:ok, selector_to_map(spec.selector)} end
    field :strategy, :deployment_strategy
  end

  defp selector_to_map(nil), do: nil

  defp selector_to_map(%LabelSelector{match_labels: labels, match_expressions: exprs}) do
    %{}
    |> maybe_put("matchLabels", labels && stringify_keys(labels))
    |> maybe_put("matchExpressions", exprs && Enum.map(exprs, &requirement_to_map/1))
    |> case do
      %{} = m when map_size(m) == 0 -> nil
      m -> m
    end
  end

  defp maybe_put(map, _key, nil), do: map
  defp maybe_put(map, _key, []), do: map
  defp maybe_put(map, key, value), do: Map.put(map, key, value)

  defp requirement_to_map(%LabelSelectorRequirement{key: key, operator: op, values: values}) do
    %{"key" => key, "operator" => op}
    |> maybe_put("values", values)
  end

  defp stringify_keys(nil), do: nil
  defp stringify_keys(map) when is_map(map),
    do: Map.new(map, fn {k, v} -> {to_string(k), v} end)

  object :replica_set_spec do
    field :replicas, :integer
  end

  object :deployment_strategy do
    field :type,           :string
    field :rolling_update, :rolling_update
  end

  object :rolling_update do
    field :max_surge,       :integer
    field :max_unavailable, :integer
  end

  object :replica_set_status do
    field :available_replicas,     :integer
    field :conditions,             list_of(:status_condition)
    field :replicas,               :integer
    field :ready_replicas,         :integer
    field :fully_labeled_replicas, :integer
  end
end
