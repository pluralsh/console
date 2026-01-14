defmodule Console.Schema.PolicyBinding do
  use Piazza.Ecto.Schema
  alias Console.Schema.{User, Group}
  alias Console.Repo
  import Ecto.Query

  schema "policy_bindings" do
    field :policy_id, :binary_id
    belongs_to :user, User
    belongs_to :group, Group

    timestamps()
  end

  @doc """
  Fetches all tables and their policy-related columns from the database schema.
  Returns a map of table_name => [column_names] for uuid columns ending in '_policy_id' or 'bindings_id'.
  """
  def policy_columns do
    from(c in "columns",
      prefix: "information_schema",
      where: like(c.column_name, "%policy_id") or c.column_name == "bindings_id",
      where: c.table_schema == "public",
      where: c.table_name != "policy_bindings",
      where: c.data_type == "uuid",
      select: {c.table_name, c.column_name},
      order_by: [c.table_name, c.column_name]
    )
    |> Repo.all(timeout: 30_000)
    |> Enum.group_by(fn {table, _col} -> table end, fn {_table, col} -> col end)
  end

  @doc """
  Returns IDs of policy bindings not referenced by any of the given tables.
  Uses a database-side subquery with LEFT JOIN to avoid loading all policy_ids into memory.

  ## Parameters
    - `table_columns` - A map of table_name => [column_names] to check for references.
      If not provided, defaults to all policy columns discovered via `policy_columns/0`.

  ## Examples

      # Check against all tables with policy columns
      PolicyBinding.dangling_ids()

      # Check against specific tables only
      PolicyBinding.dangling_ids(%{"clusters" => ["read_policy_id", "write_policy_id"]})

  """
  def dangling_ids(table_columns \\ nil) do
    table_columns = table_columns || policy_columns()

    case build_referenced_subquery(table_columns) do
      nil ->
        # No tables to check against, all bindings are considered "dangling"
        from(pb in __MODULE__, select: pb.id, order_by: [asc: pb.id])
        |> Repo.all(timeout: 300_000)

      referenced_subquery ->
        from(pb in __MODULE__,
          left_join: r in subquery(referenced_subquery),
          on: pb.policy_id == r.policy_id,
          where: is_nil(r.policy_id),
          select: pb.id,
          order_by: [asc: pb.id]
        )
        |> Repo.all(timeout: 300_000)
    end
  end

  @doc """
  Builds a subquery that unions all referenced policy_ids from the given tables.
  Returns nil if there are no tables/columns to check.
  """
  def build_referenced_subquery(table_columns) when map_size(table_columns) == 0, do: nil

  def build_referenced_subquery(table_columns) do
    queries =
      table_columns
      |> Enum.flat_map(fn {table, columns} ->
        Enum.map(columns, fn col ->
          col_atom = String.to_atom(col)

          from(t in table,
            select: %{policy_id: field(t, ^col_atom)},
            where: not is_nil(field(t, ^col_atom))
          )
        end)
      end)

    case queries do
      [] -> nil
      [single] -> single
      [first | rest] ->
        Enum.reduce(rest, first, fn query, acc ->
          from(q in acc, union_all: ^query)
        end)
    end
  end

  @doc """
  Returns an Ecto query for dangling policy bindings.

  ## Parameters
    - `query` - Base query to filter (defaults to PolicyBinding)
    - `table_columns` - Optional map of table_name => [column_names] to check against

  """
  def dangling(query \\ __MODULE__, table_columns \\ nil) do
    ids = dangling_ids(table_columns)
    from(p in query, where: p.id in ^ids)
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :id]) do
    from(p in query, order_by: ^order)
  end

  @valid ~w(user_id group_id policy_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:user_id)
    |> foreign_key_constraint(:group_id)
  end
end
