defmodule Console.AI.Tools.Workbench.Infrastructure.CloudTables do
  use Console.AI.Tools.Agent.Base
  alias Console.Schema.{CloudConnection, WorkbenchTool}
  alias Cloudquery.TablesInput

  embedded_schema do
    field :tool, :map, virtual: true
    field :table, :string
  end

  @valid ~w(table)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
  end

  @json_schema Console.priv_file!("tools/workbench/infrastructure/cloud_tables.json") |> Jason.decode!()

  def json_schema(_), do: @json_schema
  def name(%__MODULE__{tool: %{name: name}}), do: "cloud_tables_#{name}"
  def description(%__MODULE__{tool: %WorkbenchTool{cloud_connection: %CloudConnection{provider: provider}}}),
    do: "Shows the available tables for querying a #{provider} cloud account using sql. Can also fuzzy search for certain tables using the table parameter to save tokens."

  def implement(_, %__MODULE__{tool: %WorkbenchTool{cloud_connection: %CloudConnection{} = connection}, table: table}) do
    with {:ok, client} <- Client.connect(),
         input = %TablesInput{connection: to_pb(connection), table: table},
         {:ok, output} <- Stub.tables(client, input) do
      Protobuf.JSON.encode(output)
    end
  end
end
