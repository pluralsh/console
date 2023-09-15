defmodule Console.TestHelpers do
  alias Console.Schema.Cluster
  alias Console.Deployments.Services

  def create_service(%Cluster{id: id}, user, attrs), do: Services.create_service(Map.new(attrs), id, user)

  def ids_equal(found, expected) do
    found = MapSet.new(ids(found))
    expected = MapSet.new(ids(expected))

    MapSet.equal?(found, expected)
  end

  def by_ids(models) do
    Enum.into(models, %{}, & {id(&1), &1})
  end

  def ids(list) do
    Enum.map(list, &id/1)
  end

  def wait(query, valid, elapsed \\ 0)
  def wait(_, _, elapsed) when elapsed > 5_000, do: :error
  def wait(query, valid, elapsed) do
    res = query.()
    case valid.(res) do
      true -> {:ok, res}
      _ ->
        :timer.sleep(200)
        wait(query, valid, elapsed + 200)
    end
  end

  def id(%{id: id}), do: id
  def id(%{"id" => id}), do: id
  def id(id) when is_binary(id), do: id

  def refetch(%{__struct__: schema, id: id}), do: Console.Repo.get(schema, id)

  def run_query(query, variables, context \\ %{}),
    do: Absinthe.run(query, Console.GraphQl, variables: variables, context: context)

  def from_connection(%{"edges" => edges}), do: Enum.map(edges, & &1["node"])
end
