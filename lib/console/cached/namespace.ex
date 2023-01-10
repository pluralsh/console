defmodule Console.Cached.Namespace do
  @moduledoc """
  This genserver will query and poll all namespaces then cache them in-memory.  This is to accelerate namespace lookups throughout
  the codebase, as it seems to be necessary for some advanced filtering
  """
  use Console.Cached.Base
  alias Kazan.Apis.Core.V1, as: CoreV1

  def start_link(), do: Console.Cached.Kubernetes.start_link(__MODULE__, CoreV1.list_namespace!())

  def fetch(), do: Console.Cached.Kubernetes.fetch(__MODULE__)
end
