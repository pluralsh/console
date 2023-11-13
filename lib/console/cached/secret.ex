defmodule Console.Cached.Secret do
  @moduledoc """
  This genserver will query and poll all kubeconfig secrets then cache them in-memory.
  """
  use Console.Cached.Base
  alias Kazan.Apis.Core.V1, as: CoreV1

  def start_link(), do: Console.Cached.Kubernetes.start_link(__MODULE__, query(), CoreV1.Secret, nil, &key/1)

  def start(), do: Console.Cached.Kubernetes.start(__MODULE__, query(), CoreV1.Secret, nil, &key/1)

  def fetch(), do: Console.Cached.Kubernetes.fetch(__MODULE__)

  def get(ns, name), do: Console.Cached.Kubernetes.get(__MODULE__, {ns, name})

  defp query() do
    CoreV1.list_secret_for_all_namespaces!(label_selector: "cluster.x-k8s.io/cluster-name")
  end

  defp key(%{metadata: %{namespace: ns, name: n}}), do: {ns, n}
end
