defmodule Console.AI.Tools.Agent.Schema do
  use Console.AI.Tools.Agent.Base
  alias Cloudquery.{SchemaInput, SchemaOutput, SchemaResult, SchemaColumn}

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

  def implement(%__MODULE__{}) do
    with {:session, %AgentSession{connection: %CloudConnection{} = connection}} <- session(),
         {:ok, client} <- Client.connect(),
         input = %SchemaInput{connection: to_pb(connection)},
         {:ok, %SchemaOutput{result: results}} <- Stub.schema(client, input) do
      Enum.map(results, fn %SchemaResult{table: table, columns: columns} ->
        %{table: table, columns: Enum.map(columns, &column_map/1)}
      end)
      |> Jason.encode()
    else
      {:session, _} ->
        {:ok, "No cloud connection tied to this session, cannot query"}
      {:error, reason} ->
        {:ok, "Error getting schema: #{inspect(reason)}"}
    end
  end

  defp column_map(%SchemaColumn{column: column, type: type}), do: %{name: column, type: type}

  # TODO: implement filtering when we know the ai is smart enough to ask for a specific table
  # defp maybe_filter(results, %__MODULE__{table: table}) when is_binary(table) and byte_size(table) > 0 do
  #   Enum.filter(results, fn %SchemaResult{table: t} -> String.contains?(t, table) end)
  # end
  # defp maybe_filter(results, _), do: results
end
