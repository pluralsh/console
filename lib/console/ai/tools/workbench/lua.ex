defmodule Console.AI.Tools.Workbench.Lua do
  use Console.AI.Tools.Workbench.Base
  alias CloudQuery.Client
  alias Toolquery.ToolQuery.Stub
  alias Toolquery.{RunLuaInput, RunLuaOutput}

  embedded_schema do
    field :explanation, :string
    field :code,        :string
  end

  @json_schema Console.priv_file!("tools/workbench/lua.json") |> Jason.decode!()

  def name(), do: "workbench_lua"

  def description(),
    do:
      "Execute a Lua script to perform sandboxed general computation for things like complex calculations and other tasks you need an exact answer for."

  def json_schema(), do: @json_schema

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:explanation, :code])
    |> validate_required([:explanation, :code])
  end

  def implement(%__MODULE__{code: code}) do
    with {:ok, client} <- Client.connect(),
         input = %RunLuaInput{script: code},
         {:ok, %RunLuaOutput{result_json: result_json}} <- Stub.run_lua(client, input) do
      {:ok, result_json}
    end
  end
end
