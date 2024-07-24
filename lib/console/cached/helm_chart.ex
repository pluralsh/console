defmodule Console.Cached.HelmChart do
  @moduledoc """
  This genserver will query and poll all kubeconfig secrets then cache them in-memory.
  """
  use Console.Cached.Base
  alias Kube.HelmChart

  def start_link(), do: Console.Cached.Kubernetes.start_link(__MODULE__, list_request(HelmChart), HelmChart, nil, &key/1)

  def start(), do: Console.Cached.Kubernetes.start(__MODULE__, list_request(HelmChart), HelmChart, nil, &key/1)

  def fetch(), do: Console.Cached.Kubernetes.fetch(__MODULE__)

  def get(ns, name), do: Console.Cached.Kubernetes.get(__MODULE__, {ns, name})

  defp key(%{metadata: %{namespace: ns, name: n}}), do: {ns, n}
end
