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

    table_columns
    |> referenced_policy_ids()
    |> unreferenced_binding_ids()
  end

  @doc """
  Returns all policy_ids that are referenced by the given tables.
  Each table is queried independently, reducing complexity compared to NOT EXISTS approach.
  """
  def referenced_policy_ids(table_columns) do
    table_columns
    |> Enum.flat_map(fn {table, columns} ->
      columns
      |> Enum.map(fn col ->
        from(t in table, select: field(t, ^String.to_existing_atom(col)), where: not is_nil(field(t, ^String.to_existing_atom(col))))
        |> Repo.all(timeout: 60_000)
        |> Enum.map(&Ecto.UUID.load!/1)  # Convert raw binary UUIDs to string format for :binary_id comparison
      end)
      |> List.flatten()
    end)
    |> MapSet.new()
  end

  @doc """
  Returns IDs of policy bindings whose policy_id is not in the given set of referenced IDs.
  """
  def unreferenced_binding_ids(referenced_ids) do
    referenced_list = MapSet.to_list(referenced_ids)

    from(pb in __MODULE__,
      where: pb.policy_id not in ^referenced_list,
      select: pb.id,
      order_by: [asc: pb.id]
    )
    |> Repo.all(timeout: 300_000)
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
