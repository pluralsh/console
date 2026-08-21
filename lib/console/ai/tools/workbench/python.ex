defmodule Console.AI.Tools.Workbench.Python do
  use Console.AI.Tools.Workbench.Base
  alias CloudQuery.Client
  alias Console.AI.Tools.Workbench.Output
  alias Toolquery.ToolQuery.Stub
  alias Toolquery.{RunPythonInput, RunPythonOutput}

  embedded_schema do
    field :explanation, :string
    field :code,        :string
    field :input,       :map
  end

  @json_schema Console.priv_file!("tools/workbench/python.json") |> Jason.decode!()

  def name(), do: "workbench_python"

  def description(),
    do:
      "Execute a sandboxed Monty Python script for precise computation. It supports a limited Python subset only and cannot access the filesystem, environment, network, subprocesses, pip, packages, or host tools."

  def json_schema(), do: @json_schema

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:explanation, :code, :input])
    |> validate_required([:explanation, :code])
  end

  def implement(%__MODULE__{code: code, input: input}) do
    with {:ok, client} <- Client.connect(),
         {:ok, input_json} <- Jason.encode(input || %{}),
         request = %RunPythonInput{script: code, input_json: input_json},
         {:ok, %RunPythonOutput{result_json: result_json, stdout: stdout}} <- Stub.run_python(client, request, Client.cloud_query_rpc_opts()),
         {:ok, result} <- Jason.decode(result_json) do
      Output.json(%{result: result, stdout: stdout})
    end
  end
end
