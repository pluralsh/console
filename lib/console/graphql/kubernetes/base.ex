defmodule Console.GraphQl.Kubernetes.Base do
  alias Kazan.Models.Apimachinery.Meta.V1, as: MetaV1

  def encode(%{__struct__: struct} = model) do
    model = prune(model)
    {:ok, data} = struct.encode(model)
    Jason.encode(data)
  end

  defp prune(%{metadata: %MetaV1.ObjectMeta{} = meta} = object),
    do: put_in(object.metadata.managed_fields, [])
  defp prune(obj), do: obj

  defmacro namespace_args() do
    quote do
      arg :namespace, non_null(:string)
      arg :name,      non_null(:string)
    end
  end
end
