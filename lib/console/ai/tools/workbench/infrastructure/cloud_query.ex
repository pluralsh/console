defmodule Console.AI.Tools.Workbench.Infrastructure.CloudQuery do
  use Console.AI.Tools.Agent.Base
  alias Console.Schema.{CloudConnection, WorkbenchTool}
  alias Cloudquery.QueryInput

  embedded_schema do
    field :tool,  :map, virtual: true
    field :query, :string
  end

  @valid ~w(query)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required([:query])
  end

  @json_schema Console.priv_file!("tools/workbench/infrastructure/cloud_query.json") |> Jason.decode!()

  def json_schema(_), do: @json_schema
  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "cloud_query_#{name}"
  def description(%__MODULE__{tool: %WorkbenchTool{cloud_connection: %CloudConnection{provider: provider}}}),
    do: "Performs a postgresql-compatible sql query against the #{provider} cloud account.  You *must* use the cloud schema tool to discover the schema of the sql database first before calling this so it uses the proper tables and columns."

  def implement(%__MODULE__{query: query, tool: %WorkbenchTool{cloud_connection: %CloudConnection{} = connection}}) do
    with {:ok, client} <- Client.connect(),
         input = %QueryInput{query: query, connection: to_pb(connection)},
         {:ok, result} <- Stub.query(client, input) do
      Protobuf.JSON.encode(result)
    end
  end
end
