defmodule Console.AI.Tools.Agent.Query do
  use Console.AI.Tools.Agent.Base
  alias Cloudquery.QueryInput

  embedded_schema do
    field :query, :string
  end

  @valid ~w(query)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
  end

  @json_schema Console.priv_file!("tools/agent/query.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("cloud_query")
  def description(), do: "Performs a sql-compatible query against the cloud account configured with this session, use the cloud_schema tool to introspect the various tables available if necesssary."

  def implement(%__MODULE__{query: query}) do
    with {:session, %AgentSession{connection: %CloudConnection{} = connection}} <- session(),
         {:ok, client} <- Client.connect(),
         input = %QueryInput{query: query, connection: to_pb(connection)},
         {:ok, result} <- Stub.query(client, input) do
      {:ok, result.result}
    else
      {:session, _} -> {:ok, "No cloud connection tied to this session, cannot query"}
      {:error, reason} -> {:ok, "Error getting schema: #{inspect(reason)}"}
    end
  end
end
