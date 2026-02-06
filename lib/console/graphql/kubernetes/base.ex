defmodule Console.GraphQl.Kubernetes.Base do
  alias Kazan.Models.Apimachinery.Meta.V1, as: MetaV1

  def encode(%{__struct__: struct} = model) do
    {:ok, data} = prune(model) |> struct.encode()
    Jason.encode(data)
  end

  def safe_to_string(nil), do: nil
  def safe_to_string(v), do: to_string(v)

  def multi_get(map, keys), do: Enum.find_value(keys, &Map.get(map, &1))

  defp prune(%{metadata: %MetaV1.ObjectMeta{}} = object),
    do: put_in(object.metadata.managed_fields, [])
  defp prune(obj), do: obj

  defmacro namespace_args() do
    quote do
      arg :namespace, non_null(:string)
      arg :name,      non_null(:string)
    end
  end
end
