defmodule Console.Deployments.Pipelines.Stability do
  alias Console.Deployments.Services

  def stabilize(nil, attrs), do: Map.drop(attrs, [:edges])
  def stabilize(pipe, attrs) do
    Map.merge(attrs, stabilize_stages(pipe.stages, attrs))
    |> Map.drop([:edges])
  end

  def stabilize_edges(%{edges: old_edges} = pipe, %{edges: edges}) when is_list(edges) do
    stage_by_name = Map.new(pipe.stages, & {&1.name, &1.id})
    edge_map = Map.new(coerce_edges(old_edges), & {{&1.from_id, &1.to_id}, &1.id})
    edges = Enum.map(edges, fn
      %{from_id: f, to_id: t} = edge when is_binary(f) and is_binary(t) -> edge
      %{from: f, to: t} = edge -> Map.merge(edge, %{from_id: stage_by_name[f], to_id: stage_by_name[t]})
    end)
    %{edges: Enum.map(edges, &Map.put(&1, :id, edge_map[{&1.from_id, &1.to_id}]))}
  end
  def stabilize_edges(_, attrs), do: Map.take(attrs, [:edges])

  defp coerce_edges(edges) when is_list(edges), do: edges
  defp coerce_edges(_), do: []

  defp stabilize_stages(stages, %{stages: new_stages}) when is_list(stages) do
    stage_map = Map.new(stages, & {&1.name, &1})
    stages =
      Enum.map(new_stages, fn %{name: name} = stage ->
        case stage_map[name] do
          %{id: id} -> Map.put(stage, :id, id)
          _ -> stage
        end
      end)
      |> Enum.map(&stabilize_services(&1, stage_map[&1.name]))
    %{stages: stages}
  end
  defp stabilize_stages(_, %{stages: stages}) do
    %{stages: Enum.map(stages, &stabilize_services(&1, %{}))}
  end
  defp stabilize_stages(_, _), do: %{}

  defp stabilize_services(%{services: [_ | _] = new_svcs} = new_stage, %{services: svcs}) when is_list(svcs) do
    svc_map = Map.new(svcs, & {&1.service_id, &1.id})
    new_svcs = preprocess(new_svcs)
               |> Enum.map(&Map.put(&1, :id, svc_map[&1.service_id]))
    Map.put(new_stage, :services, new_svcs)
  end
  defp stabilize_services(%{services: [_ | _] = svcs} = attrs, _), do: Map.put(attrs, :services, preprocess(svcs))
  defp stabilize_services(attrs, _), do: attrs

  defp preprocess(new_svcs) do
    Enum.map(new_svcs, fn
      %{service_id: id} = svc when is_binary(id) -> process_criteria(svc)
      %{handle: handle, name: name} = svc ->
        service = Services.get_service_by_handle!(handle, name)
        Map.put(svc, :service_id, service.id)
        |> process_criteria()
    end)
  end

  defp process_criteria(%{criteria: %{handle: h, name: n} = criteria} = stage_svc) do
    svc = Services.get_service_by_handle!(h, n)
    %{stage_svc | criteria: Map.put(criteria, :source_id, svc.id)}
  end
  defp process_criteria(svc), do: svc
end
