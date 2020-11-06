defmodule Watchman.GraphQl.Kubernetes.Base do
  def encode(%{__struct__: struct} = model) do
    {:ok, data} = struct.encode(model)
    Jason.encode(data)
  end
end