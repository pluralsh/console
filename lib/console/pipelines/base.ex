defmodule Console.Pipelines.Base do
  def log({:ok, %{id: id}}, msg), do: "Successfully #{msg} for #{id}"
  def log({:error, error}, msg), do: "Failed to #{msg} with error: #{inspect(error)}"
  def log(_, _), do: :ok

  def refetch(%{__struct__: schema, id: id}), do: Console.Repo.get(schema, id)

  def limit(demand) do
    node_count = length(Node.list()) + 1
    max(demand * node_count, 100)
  end
end
