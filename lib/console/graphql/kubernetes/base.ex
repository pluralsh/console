defmodule Console.GraphQl.Kubernetes.Base do
  def encode(%{__struct__: struct} = model) do
    {:ok, data} = struct.encode(model)
    Jason.encode(data)
  end

  defmacro namespace_args() do
    quote do
      arg :namespace, non_null(:string)
      arg :name,      non_null(:string)
    end
  end
end
