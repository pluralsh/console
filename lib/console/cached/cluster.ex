defmodule Console.Cached.Cluster do
  @moduledoc """
  This genserver will query and poll all pods then cache them in-memory.  This is to accelerate pod lookups since
  it's pretty damn slow currently
  """
  use Console.Cached.Base
  import Kube.Client.Base, only: [path_builder: 3]
  alias Kube.Cluster

  def start_link(), do: Console.Cached.Kubernetes.start_link(__MODULE__, cluster_request(), Cluster, nil, &key/1)

  def start(), do: Console.Cached.Kubernetes.start(__MODULE__, cluster_request(), Cluster, nil, &key/1)

  def fetch(), do: Console.Cached.Kubernetes.fetch(__MODULE__)

  def get(ns, name), do: Console.Cached.Kubernetes.get(__MODULE__, {ns, name})

  defp cluster_request() do
    %Kazan.Request{
      method: "get",
      path: path_builder("cluster.x-k8s.io", "v1beta1", "clusters"),
      body: "",
      query_params: %{},
      content_type: "application/json",
      response_model: Cluster.List
    }
  end

  defp key(%{metadata: %{namespace: ns, name: n}}), do: {ns, n}
end
