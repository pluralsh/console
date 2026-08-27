defmodule Console.AI.Tools.Workbench.Infrastructure.CloudSchemas.Cell do
  @enforce_keys [:value]
  defstruct [:value]
end

defimpl Inspect, for: Console.AI.Tools.Workbench.Infrastructure.CloudSchemas.Cell do
  import Inspect.Algebra

  def inspect(%{value: value}, _opts), do: concat([value])
end

defmodule Console.AI.Tools.Workbench.Infrastructure.CloudSchemas do
  use Console.AI.Tools.Agent.Base
  alias Console.Schema.{CloudConnection, WorkbenchTool}
  alias Cloudquery.SchemasInput

  require EEx

  embedded_schema do
    field :tool, :map, virtual: true
    field :tables, {:array, :string}
  end

  @valid ~w(tables)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
  end

  @json_schema Console.priv_file!("tools/workbench/infrastructure/cloud_schemas.json") |> Jason.decode!()

  def json_schema(_), do: @json_schema
  def name(%__MODULE__{tool: %{name: name}}), do: "cloud_schemas_#{name}"
  def name(_), do: "cloud_schemas"

  def description(%__MODULE__{tool: %WorkbenchTool{cloud_connection: %CloudConnection{provider: provider}}}),
    do: "Shows the schemas for an exact list of tables in a #{provider} cloud account. Use after cloud_tables to inspect only the tables needed for a SQL query."
  def description(_),
    do: "Shows the schemas for an exact list of tables in a cloud account. Use after cloud_tables to inspect only the tables needed for a SQL query."

  def implement(%__MODULE__{tool: %WorkbenchTool{cloud_connection: %CloudConnection{} = connection}, tables: tables}) do
    with %{} = pb <- to_pb(connection) || {:error, "cloud connection is missing provider credentials"},
         {:ok, client} <- Client.connect(),
         input = %SchemasInput{connection: pb, tables: tables},
         {:ok, output} <- Stub.schemas(client, input, Client.cloud_query_rpc_opts()) do
      format_schema(results: output.result || [])
      |> String.trim()
      |> then(& {:ok, &1})
    end
  end
  def implement(_), do: {:error, "cloud schemas tool is missing a cloud connection"}

  EEx.function_from_file(
    :defp,
    :format_schema,
    Path.join(:code.priv_dir(:console), "tools/workbench/infrastructure/cloud_schemas.eex"),
    [:assigns]
  )
end
