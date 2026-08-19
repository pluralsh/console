defmodule Console.AI.Tools.Workbench.FunctionCall do
  use Console.AI.Tools.Workbench.Base
  import Console.AI.Tools.Agent.Base, only: [to_pb: 1]
  alias Console.Repo
  alias CloudQuery.Client
  alias Toolquery.{ToolQuery.Stub, InvokeLambdaInput}
  alias Console.AI.Tools.Workbench.Http
  alias Console.Deployments.Workbenches
  alias Console.Schema.WorkbenchTool
  alias Console.Schema.WorkbenchTool.Configuration
  alias Configuration.{CloudFunctionConnection, CloudRunConnection, LambdaConnection, HttpConfiguration}

  embedded_schema do
    field :tool,        :map, virtual: true
    field :job,         :map, virtual: true
    field :approval,    :map, virtual: true
    field :input,       :map
    field :explanation, :string
  end

  @valid ~w(input explanation)a
  @default_schema %{"type" => "object", "properties" => %{}, "required" => []}

  def json_schema(%{tool: tool}) do
    input = input_schema(tool) || @default_schema

    explanation = %{
      "type" => "string",
      "description" => "Clearly explain why this action is needed, what it will do, and the target it affects so the user can make an informed approval decision."
    }

    %{
      "type" => "object",
      "properties" => %{"input" => input, "explanation" => explanation},
      "required" => ["input", "explanation"]
    }
  end

  def name(%__MODULE__{tool: %WorkbenchTool{name: name, tool: tool}}),
    do: "#{tool}_function_call_#{name}"

  def description(%__MODULE__{tool: %WorkbenchTool{} = tool}),
    do: String.trim(explain_approval(function_description(tool), tool.approval))

  def changeset(model, attrs) do
    schema = input_schema(model) || @default_schema

    model
    |> cast(attrs, @valid)
    |> validate_required([:input, :explanation])
    |> validate_change(:input, fn :input, input ->
      ExJsonSchema.Schema.resolve(schema)
      |> ExJsonSchema.Validator.validate(input)
      |> case do
        :ok -> []
        {:error, errors} -> [input: "is not a valid input: #{inspect(errors)}"]
      end
    end)
  end

  def implement(%__MODULE__{} = model), do: {:ok, model}

  def invoke(%__MODULE__{approval: a, tool: %WorkbenchTool{approval: true} = tool, job: job, input: input, explanation: explanation}) do
    Workbenches.create_job_activity(%{
      prompt: prompt(tool),
      result: Map.merge(%{
        output: "waiting for user approval",
        explanation: explanation,
        function_call: %{
          name: tool.name,
          tool_id: tool.id,
          input: input
        }
      }, Console.AI.Tool.Approval.attrs(a)),
      tool_call: tool_attrs(tool),
      type: :function,
      status: :needs_approval,
    }, job)
  end


  def invoke(%__MODULE__{tool: %WorkbenchTool{} = tool, job: job, input: input, explanation: explanation}) do
    case call_function(tool, input) do
      {:ok, output} -> output
      {:error, err} -> "Tool call invocation failed: #{inspect(err)}"
    end
    |> then(&Workbenches.create_job_activity(%{
      prompt: prompt(tool),
      result: %{
        output: &1,
        explanation: explanation,
        function_call: %{
          name: tool.name,
          tool_id: tool.id,
          input: input
        }
      },
      tool_call: tool_attrs(tool),
      type: :function,
      status: :successful,
    }, job))
  end

  def call_function(%WorkbenchTool{tool: :http} = tool, %{} = input), do: Http.invoke(tool, input)
  def call_function(%WorkbenchTool{} = tool, %{} = input) do
    %{cloud_connection: cloud_conn} = Repo.preload(tool, :cloud_connection)

    with {:ok, conn} <- Client.connect(),
         {:ok, json} <- Jason.encode(input),
         {:ok, identifier} <- identifier(tool),
         input = %InvokeLambdaInput{connection: to_pb(cloud_conn), identifier: identifier, payload_json: json},
         {:ok, output} <- Stub.invoke_lambda(conn, input, Client.lambda_rpc_opts()),
    do: Protobuf.JSON.encode(output)
  end

  defp explain_approval(d, true) when is_binary(d), do: "#{d} (This action requires approval)."
  defp explain_approval(d, _), do: d

  defp function_config(%WorkbenchTool{
    tool: :lambda,
    configuration: %Configuration{lambda: %LambdaConnection{} = config}
  }), do: config

  defp function_config(%WorkbenchTool{
    tool: :cloud_run,
    configuration: %Configuration{cloud_run: %CloudRunConnection{} = config}
  }), do: config

  defp function_config(%WorkbenchTool{
    tool: :azure_function,
    configuration: %Configuration{azure_function: %CloudFunctionConnection{} = config}
  }), do: config

  defp function_config(%WorkbenchTool{
    tool: :http,
    configuration: %Configuration{http: %HttpConfiguration{} = config}
  }), do: config

  defp function_config(_), do: nil

  defp function_description(%WorkbenchTool{} = tool) do
    case function_config(tool) do
      %{description: description} when is_binary(description) -> description
      _ -> "Function call against an external tool."
    end
  end

  defp input_schema(%__MODULE__{tool: tool}), do: input_schema(tool)

  defp input_schema(%WorkbenchTool{} = tool) do
    case function_config(tool) do
      %{input_schema: input_schema} when is_map(input_schema) -> input_schema
      _ -> nil
    end
  end
  defp input_schema(_), do: nil

  defp identifier(%WorkbenchTool{} = tool) do
    case function_config(tool) do
      %{identifier: identifier} when is_binary(identifier) -> {:ok, identifier}
      %{lambda_arn: lambda_arn} when is_binary(lambda_arn) -> {:ok, lambda_arn}
      _ -> {:error, "No identifier found for tool"}
    end
  end

  defp tool_attrs(%{id: %Console.AI.Tool{id: id, name: name, arguments: arguments}}) when is_binary(id) and is_binary(name),
    do: %{call_id: id, name: name, arguments: arguments}
  defp tool_attrs(_), do: nil

  defp prompt(%WorkbenchTool{name: name}), do: "function call: #{name}"
end
