defmodule Console.Cached.Pod do
  @moduledoc """
  This genserver will query and poll all pods then cache them in-memory.  This is to accelerate pod lookups since
  it's pretty damn slow currently
  """
  use Console.Cached.Base
  alias Kazan.Apis.Core.V1, as: CoreV1

  def start_link(), do: Console.Cached.Kubernetes.start_link(__MODULE__, CoreV1.list_pod_for_all_namespaces!(), CoreV1.Pod)

  def start(), do: Console.Cached.Kubernetes.start(__MODULE__, CoreV1.list_pod_for_all_namespaces!(), CoreV1.Pod)

  def fetch(), do: Console.Cached.Kubernetes.fetch(__MODULE__)
end
