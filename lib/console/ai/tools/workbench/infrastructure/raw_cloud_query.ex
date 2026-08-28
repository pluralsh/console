defmodule Console.AI.Tools.Workbench.Infrastructure.RawCloudQuery do
  use Console.AI.Tools.Agent.Base
  alias Console.Schema.{CloudConnection, WorkbenchTool}
  alias Cloudquery.{QueryInput, QueryResult}

  embedded_schema do
    field :tool, :map, virtual: true
    field :query, :string
  end

  @valid ~w(query)a
  @json_schema Console.priv_file!("tools/workbench/infrastructure/cloud_query.json") |> Jason.decode!()

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required([:query])
  end

  def json_schema(_), do: @json_schema
  def name(%__MODULE__{tool: %{name: name}}), do: "cloud_query_#{name}"
  def name(_), do: "cloud_query"

  def description(%__MODULE__{tool: %WorkbenchTool{cloud_connection: %CloudConnection{provider: provider}}}),
    do: "Performs a postgresql-compatible sql query against the #{provider} cloud account.  You *must* use the cloud schema tool to discover the schema of the sql database first before calling this so it uses the proper tables and columns."
  def description(_),
    do: "Performs a postgresql-compatible sql query against a cloud account. You *must* use the cloud schema tool to discover the schema of the sql database first before calling this so it uses the proper tables and columns."

  def implement(%__MODULE__{query: query, tool: %WorkbenchTool{cloud_connection: %CloudConnection{} = connection}}) do
    with %{} = pb <- to_pb(connection) || {:error, "cloud connection is missing provider credentials"},
         {:ok, client} <- Client.connect(),
         input = %QueryInput{query: query, connection: pb},
         {:ok, %QueryResult{result: result}} <- Stub.query(client, input, Client.cloud_query_rpc_opts()),
      do: JSON.decode(result)
  end
  def implement(_), do: {:error, "cloud query tool is missing a cloud connection"}
end
