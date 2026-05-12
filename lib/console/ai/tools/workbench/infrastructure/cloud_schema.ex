defmodule Console.AI.Tools.Workbench.Infrastructure.CloudSchema do
  use Console.AI.Tools.Agent.Base
  alias Console.Schema.{CloudConnection, WorkbenchTool}
  alias Cloudquery.SchemaInput

  embedded_schema do
    field :tool, :map, virtual: true
    field :table, :string
  end

  @valid ~w(table)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
  end

  @json_schema Console.priv_file!("tools/workbench/infrastructure/cloud_schema.json") |> Jason.decode!()

  def json_schema(_), do: @json_schema
  def name(%__MODULE__{tool: %{name: name}}), do: "cloud_schema_#{name}"
  def description(%__MODULE__{tool: %WorkbenchTool{cloud_connection: %CloudConnection{provider: provider}}}),
    do: "Shows the schema for querying a #{provider} cloud account using sql. Can also search for certain datatypes using the table parameter to save tokens."

  def implement(%__MODULE__{tool: %WorkbenchTool{cloud_connection: %CloudConnection{} = connection}, table: table}) do
    with {:ok, client} <- Client.connect(),
         input = %SchemaInput{connection: to_pb(connection), table: table},
         {:ok, output} <- Stub.schema(client, input) do
      Protobuf.JSON.encode(output)
    end
  end
end
