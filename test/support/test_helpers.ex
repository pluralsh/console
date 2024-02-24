defmodule Console.TestHelpers do
  import Console.Factory
  alias Console.Schema.{Cluster, Service}
  alias Console.Deployments.Services

  def deployment_settings(args \\ []) do
    Console.Cache.flush()
    insert(:deployment_settings, args)
  end

  def create_service(attrs, %Cluster{} = cluster, user), do: create_service(cluster, user, attrs)
  def create_service(%Cluster{id: id}, user, attrs), do: Services.create_service(Map.new(attrs), id, user)

  def update_service(attrs, %Service{id: id}, user), do: Services.update_service(attrs, id, user)

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

  def update_record(model, attrs) do
    Ecto.Changeset.change(model, attrs)
    |> Console.Repo.update()
  end

  def run_query(query, variables, context \\ %{}),
    do: Absinthe.run(query, Console.GraphQl, variables: variables, context: context)

  def from_connection(%{"edges" => edges}), do: Enum.map(edges, & &1["node"])
end
