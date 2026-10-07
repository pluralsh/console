defmodule Console.GraphQl.Resolvers.Base do
  @moduledoc """
  Scaffolding for configuring dataloader and adding some useful helper functions.

  Absinthe is very opinionated and it's patterns don't lend to great code reuse.  In
  that case, at least for mutations, we should have a pattern of defining a absinthe-y
  function head that delegates to a more natural erlang definition in a services module

  ```
  def update_user(%{id: id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Users.update_user(id, attrs, user)
  ```
  """
  alias Absinthe.Relay
  defmacro __using__(model: model) do
    quote do
      import Console.GraphQl.Resolvers.Base
      import Console.Services.Base, only: [when_ok: 2]
      alias unquote(model)
      def data(args \\ %{}),
        do: Dataloader.Ecto.new(Console.Repo, query: &query/2, default_params: filter_context(args))

      def query(_queryable, _args), do: unquote(model).any()

      defoverridable [query: 2, data: 1]
    end
  end

  def filter_context(ctx) do
    Map.take(ctx, [:current_user])
  end

  def paginate(query, args) do
    Relay.Connection.from_query(query, &Console.Repo.all/1, args)
  end

  @doc """
  Paginates like `paginate/2`, keeping the query so the connection's `totalCount` can count it when selected.
  """
  def paginate_with_total(query, args) do
    with {:ok, conn} <- paginate(query, args),
      do: {:ok, Map.put(conn, :total_query, query)}
  end

  def total_count(%{total_query: query}, _, _),
    do: {:ok, Console.Repo.aggregate(Ecto.Query.exclude(query, :order_by), :count)}
  def total_count(_, _, _), do: {:ok, nil}

  def all(query) do
    {:ok, Console.Repo.all(query)}
  end

  @compile {:inline, ok: 1}
  def ok(result), do: {:ok, result}
end
