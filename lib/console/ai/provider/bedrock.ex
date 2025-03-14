defmodule Console.AI.Bedrock do
  @moduledoc """
  Implements our basic llm behaviour against a self-hosted ollama deployment
  """
  @behaviour Console.AI.Provider

  require Logger

  defstruct [:model_id, :tool_model_id, :access_key_id, :secret_access_key]

  @type t :: %__MODULE__{}

  @base_headers [{"content-type", "application/json"}]

  def new(opts) do
    %__MODULE__{
      model_id: opts.model_id,
      tool_model_id: opts.tool_model_id,
      access_key_id: opts.access_key_id,
      secret_access_key: opts.secret_access_key
    }
  end

  @doc """
  Generate a anthropic completion from
  """
  @spec completion(t(), Console.AI.Provider.history, keyword) :: {:ok, binary} | Console.error
  def completion(%__MODULE__{model_id: model} = bedrock, messages, _) do
    %ExAws.Operation.JSON{
      http_method: :post,
      path: "/model/#{model}/converse",
      headers: @base_headers,
      data: build_req(messages),
      service: :"bedrock-runtime",
    }
    |> ExAws.request(aws_opts(bedrock) ++ [service_override: :bedrock])
    |> handle_response()
  end

  def tool_call(_, _, _), do: {:error, "tool calling not implemented for this provider"}

  def embeddings(_, _), do: {:error, "embedding not implemented for this provider"}

  def tools?(), do: false

  defp build_req([{:system, system} | rest]) do
    %{
      system: [%{text: system}],
      messages: msgs(rest)
    }
  end
  defp build_req(msgs), do: %{messages: msgs(msgs)}

  defp msgs(msgs), do: Enum.map(msgs, fn {role, msg} -> %{role: role(role), content: [%{text: msg}]} end)

  defp role(:assistant), do: :assistant
  defp role(_), do: :user

  defp aws_opts(%__MODULE__{access_key_id: aki, secret_access_key: sak}) when is_binary(aki) and is_binary(sak),
    do: [aws_access_key_id: aki, aws_secret_access_key: sak]
  defp aws_opts(_), do: []

  defp handle_response({:ok, %{"output" => %{"message" => %{"content" => [_ | _] = content}}}}),
    do: {:ok, from_aws_message(content)}
  defp handle_response({:ok, res}),
    do: logged_error("Unrecognized aws bedrock output: #{Jason.encode!(res)}")
  defp handle_response({:error, {_, code, msg}}),
    do: logged_error("Error calling AWS Bedrock: code=#{code}, message=#{msg}")

  defp from_aws_message(content) do
    content
    |> Enum.map(fn
      %{"text" => t} when is_binary(t) -> t
       _ -> ""
    end)
    |> Enum.join("\n\n")
  end

  defp logged_error(msg) do
    Logger.error msg
    {:error, msg}
  end
end
