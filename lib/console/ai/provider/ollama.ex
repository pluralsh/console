defmodule Console.AI.Ollama do
  @moduledoc """
  Implements our basic llm behaviour against a self-hosted ollama deployment
  """
  @behaviour Console.AI.Provider
  import Console.AI.Provider.Base

  defstruct [:url, :model, :tool_model, :authorization]

  def defaults(), do: %{}

  @type t :: %__MODULE__{}

  def new(opts) do
    %__MODULE__{
      url: opts.url,
      model: opts.model,
      tool_model: opts.tool_model,
      authorization: opts.authorization
    }
  end

  def proxy(_), do: {:error, "anthropic proxy not implemented"}

  @doc """
  Generate a anthropic completion from
  """
  @spec completion(t(), Console.AI.Provider.context(), keyword) :: Console.AI.Provider.reqllm_completion_result()
  def completion(%__MODULE__{} = ollama, messages, opts) do
    messages
    |> reqllm_messages()
    |> generate_text(model(ollama, opts[:model]), nil, base_opts(request_opts(ollama), opts))
  end

  def context_window(_), do: 128_000 * 4

  def tool_call(_, _, _, _), do: {:error, "tool calling not implemented for this provider"}

  def embeddings(_, _), do: {:error, "embedding not implemented for this provider"}

  def tools?(), do: false

  defp model(%__MODULE__{url: url, model: default}, model) do
    ReqLLM.model!(%{
      provider: :ollama,
      model: model || default,
      base_url: ollama_url(url)
    })
  end

  defp ollama_url(url) when is_binary(url) do
    url
    |> String.trim_trailing("/")
    |> String.trim_trailing("/v1")
    |> Path.join("/v1")
  end
  defp ollama_url(_), do: nil

  defp request_opts(%__MODULE__{authorization: auth}) when is_binary(auth),
    do: [req_http_options: [headers: [{"authorization", auth}]]]
  defp request_opts(_), do: []
end
