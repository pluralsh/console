defmodule Console.AI.Vertex do
  @moduledoc """
  Implements our basic llm behaviour against the OpenAI api
  """
  @behaviour Console.AI.Provider
  alias GoogleApi.AIPlatform.V1
  alias GoogleApi.AIPlatform.V1.Api.Endpoints
  alias GoogleApi.AIPlatform.V1.Model
  alias Console.AI.GothManager

  @default_model "gemini-1.5-flash-002"

  require Logger

  defstruct [:service_account_json, :model]

  @type t :: %__MODULE__{}

  def new(opts), do: %__MODULE__{service_account_json: opts.service_account_json, model: opts.model}

  @doc """
  Generate a openai completion from
  """
  @spec completion(t(), Console.AI.Provider.history) :: {:ok, binary} | Console.error
  def completion(%__MODULE__{model: model} = vertex, messages) do
    with {:ok, %{token: token}} <- client(vertex) do
      V1.Connection.new(token)
      |> Endpoints.aiplatform_endpoints_generate_content(model || @default_model, body: build_req(messages))
      |> case do
        {:ok, %Model.GoogleCloudAiplatformV1GenerateContentResponse{
          candidates: [
            %Model.GoogleCloudAiplatformV1Candidate{
              content: %Model.GoogleCloudAiplatformV1Content{parts: parts}
            } | _
          ]
        }} -> {:ok, fmt_msg(parts)}
        err ->
          {:error, "vertex ai error: #{fmt_err(err)}"}
      end
    end
  end

  defp client(%__MODULE__{service_account_json: json}) when is_binary(json) do
    with {:ok, json} <- Jason.decode(json),
      do: GothManager.fetch(source: {:service_account, json})
  end
  defp client(_), do: GothManager.fetch([])

  defp build_req(history) do
    {system, contents} = split(history)
    %Model.GoogleCloudAiplatformV1GenerateContentRequest{
      contents: contents,
      systemInstruction: system
    }
  end

  defp split([{:system, msg} | rest]), do: {to_msg({:system, msg}), Enum.map(rest, &to_msg/1)}
  defp split(hist), do: {nil, Enum.map(hist, &to_msg/1)}

  defp to_msg({role, msg}) do
    %Model.GoogleCloudAiplatformV1Content{role: to_role(role), parts: [
      %Model.GoogleCloudAiplatformV1Part{text: msg}
    ]}
  end

  defp to_role(:user), do: "user"
  defp to_role(_), do: "model"

  defp fmt_msg(parts) do
    Enum.map(parts, fn
      %Model.GoogleCloudAiplatformV1Part{text: msg} when is_binary(msg) -> msg
      _ -> ""
    end)
    |> Enum.join("\n")
  end

  defp fmt_err({:error, err}) do
    Logger.error "unknown vertex ai error: #{inspect(err)}"
    "unknown"
  end
end
