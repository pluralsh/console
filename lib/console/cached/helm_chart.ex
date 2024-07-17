defmodule Console.Cached.HelmChart do
  @moduledoc """
  This genserver will query and poll all kubeconfig secrets then cache them in-memory.
  """
  use Console.Cached.Base
  import Kube.Client.Base, only: [path_builder: 3]
  alias Kube.HelmChart

  def start_link(), do: Console.Cached.Kubernetes.start_link(__MODULE__, query(), HelmChart, nil, &key/1)

  def start(), do: Console.Cached.Kubernetes.start(__MODULE__, query(), HelmChart, nil, &key/1)

  def fetch(), do: Console.Cached.Kubernetes.fetch(__MODULE__)

  def get(ns, name), do: Console.Cached.Kubernetes.get(__MODULE__, {ns, name})

  defp query() do
    %Kazan.Request{
      method: "get",
      path: path_builder("source.toolkit.fluxcd.io", "v1beta2", "helmcharts"),
      body: "",
      query_params: %{},
      content_type: "application/json",
      response_model: HelmChart.List
    }
  end

  defp key(%{metadata: %{namespace: ns, name: n}}), do: {ns, n}
end
