defmodule Console.AI.Tools.Workbench.Infrastructure.CloudLambda do
  use Console.AI.Tools.Agent.Base
  alias Console.Schema.{CloudConnection, WorkbenchTool}
  alias Toolquery.ToolQuery.Stub
  alias Toolquery.{InvokeLambdaInput, InvokeLambdaOutput}

  embedded_schema do
    field :tool, :map, virtual: true
    field :identifier, :string
    field :payload_json, :string
  end

  @valid ~w(identifier payload_json)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required([:identifier])
  end

  @json_schema Console.priv_file!("tools/workbench/infrastructure/cloud_lambda.json") |> Jason.decode!()

  def json_schema(_), do: @json_schema
  def name(%__MODULE__{tool: %{name: name}}), do: "cloud_lambda_#{name}"

  def description(%__MODULE__{tool: %WorkbenchTool{cloud_connection: %CloudConnection{provider: provider}}}),
    do: "Invokes a serverless function in the #{provider} cloud account using canonical resource identifiers only."

  def implement(%__MODULE__{
        identifier: identifier,
        payload_json: payload_json,
        tool: %WorkbenchTool{cloud_connection: %CloudConnection{} = connection}
      }) do
    with {:ok, client} <- Client.connect(),
         {:ok, json_payload} <- payload_json(payload_json),
         input = %InvokeLambdaInput{connection: to_pb(connection), identifier: identifier, payload_json: json_payload},
         {:ok, %InvokeLambdaOutput{} = output} <- Stub.invoke_lambda(client, input),
         {:ok, content} <- Protobuf.JSON.encode(output) do
      {:ok, %{result: output.result, error: output.error, content: content}}
    end
  end

  defp payload_json(raw_json) when is_binary(raw_json) do
    raw_json = String.trim(raw_json)

    case raw_json do
      "" -> {:ok, "{}"}
      json ->
        case Jason.decode(json) do
          {:ok, _} -> {:ok, json}
          _ -> {:error, "payload_json must be valid JSON"}
        end
    end
  end

  defp payload_json(_), do: {:ok, "{}"}
end
