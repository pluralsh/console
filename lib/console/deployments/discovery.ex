defmodule Console.Deployments.Discovery do
  @moduledoc """
  Implement full api discovery for a kubernetes cluster, and cache it appropriately
  """
  alias Kazan.Apis.Core.V1, as: CoreV1

  @json "application/json"
  @v2beta "#{@json};g=apidiscovery.k8s.io;v=v2beta1;as=APIGroupDiscoveryList"
  @v2 "#{@json};g=apidiscovery.k8s.io;v=v2;as=APIGroupDiscoveryList"
  @content_type "#{@json},#{@v2beta},#{@v2}"

  @concurrency 20

  def discovery(%Kazan.Server{} = server) do
    with {:ok, gvs} <- fetch_group_versions(server) do
      Task.async_stream(gvs, fn group_version ->
        %Kazan.Request{method: "get", path: "/apis/#{group_version}", content_type: @content_type}
        |> Kazan.run(server: server)
        |> case do
          {:ok, %{resources: resources}} -> {:ok, gather_resources(group_version, resources)}
          err -> err
        end
      end, max_concurrency: @concurrency)
      |> Enum.reduce(get_core_apis(server), fn
        {:ok, {:ok, results}}, acc -> Enum.into(results, acc)
        _, acc -> acc
      end)
    else
      _ -> %{}
    end
  end

  def api_spec(%Kazan.Server{} = server, group, version) do
    %Kazan.Request{
      method: "get",
      path: "/openapi/v3/apis/#{group}/#{version}",
      content_type: @json,
      response_model: Kube.Client.EchoModel
    }
    |> Kazan.run(server: server)
  end

  defp get_core_apis(server) do
    CoreV1.get_api_resources!()
    |> Kazan.run(server: server)
    |> case do
      {:ok, %{resources: resources}} ->
        gather_resources("v1", resources)
        |> Map.new()
      _ -> %{}
    end
  end

  defp fetch_group_versions(server) do
    %Kazan.Request{method: "get", path: "/apis", content_type: @content_type}
    |> Kazan.run(server: server)
    |> case do
      {:ok, %{groups: groups}} ->
        {:ok, Enum.flat_map(groups, fn %{versions: vs} -> Enum.map(vs, & &1.group_version) end)}
      err -> err
    end
  end

  defp gather_resources(group_version, resources) do
    {g, v} = split(group_version)
    Enum.filter(resources, & !String.contains?(&1.name, "/"))
    |> Enum.map(& {{g, v, &1.kind}, &1.name})
  end

  defp split(group_version) do
    case String.split(group_version, "/") do
      [g, v] -> {g, v}
      _ -> {nil, group_version}
    end
  end
end
