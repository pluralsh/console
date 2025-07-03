defmodule Console.AI.Tools.Agent.Schema do
  use Console.AI.Tools.Agent.Base
  alias Cloudquery.SchemaInput

  embedded_schema do
    field :table, :string
  end

  @valid ~w(table)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
  end

  @json_schema Console.priv_file!("tools/agent/schema.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("cloud_schema")
  def description(), do: "Shows the schema for querying a cloud accounts configuration data using sql.  Ignore the table parameter to see all available sql tables."

  def implement(%__MODULE__{table: table}) do
    with {:session, %AgentSession{connection: %CloudConnection{} = connection}} <- session(),
         {:ok, client} <- Client.connect(),
         input = %SchemaInput{table: table, connection: to_pb(connection)},
         {:ok, result} <- Stub.schema(client, input) do
      {:ok, Jason.encode!(Map.take(result, [:table, :columns]))}
    else
      {:session, _} -> {:ok, "No cloud connection tied to this session, cannot query"}
      {:error, reason} -> {:ok, "Error getting schema: #{inspect(reason)}"}
    end
  end
end
