defmodule Console.Cached.Node do
  @moduledoc """
  This genserver will query and poll all pods then cache them in-memory.  This is to accelerate pod lookups since
  it's pretty damn slow currently
  """
  use Console.Cached.Base
  alias Kazan.Apis.Core.V1, as: CoreV1
  require Logger

  def start_link(), do: Console.Cached.Kubernetes.start_link(__MODULE__, CoreV1.list_node!(), CoreV1.Node, &publish/1)

  def start(), do: Console.Cached.Kubernetes.start(__MODULE__, CoreV1.list_node!(), CoreV1.Node, &publish/1)

  def fetch(), do: Console.Cached.Kubernetes.fetch(__MODULE__)

  defp publish(%{type: event, object: node}) do
    Logger.info "Publishing metrics after #{event} for #{node.metadata.name}"
    # Console.Watchers.Upgrade.record_usage()
  end
end
