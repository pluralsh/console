defmodule Console.AI.Bedrock do
  @moduledoc """
  Implements our basic llm behaviour against a self-hosted ollama deployment
  """
  @behaviour Console.AI.Provider
  import Console.AI.Provider.Base
  alias Console.AI.{Utils, Stream}

  require Logger

  defstruct [:access_token, :model_id, :tool_model_id, :region, :embedding_model, :aws_access_key_id, :aws_secret_access_key, :endpoint, :model_settings, :stream]

  @type t :: %__MODULE__{}

  def defaults(), do: Console.AI.Provider.model_defaults(:bedrock)

  def new(opts) do
    model_defaults = defaults()
    %__MODULE__{
      model_id: opts.model_id || model_defaults[:model],
      tool_model_id: opts.tool_model_id || model_defaults[:tool_model],
      embedding_model: opts.embedding_model || model_defaults[:embedding_model],
      aws_access_key_id: opts.aws_access_key_id,
      aws_secret_access_key: opts.aws_secret_access_key,
      access_token: opts.access_token,
      region: opts.region,
      endpoint: opts.endpoint || :runtime,
      model_settings: opts.model_settings || [],
      stream: Stream.stream(),
    }
  end

  def proxy(%__MODULE__{}), do: {:error, "proxy not implemented for this provider"}

  @doc """
  Generate a openai completion
  """
  @spec completion(t(), Console.AI.Provider.history, keyword) :: {:ok, binary} | Console.error
  def completion(%__MODULE__{} = bedrock, messages, opts) do
    model = select_model(bedrock, opts[:model], opts[:client])

    messages
    |> reqllm_messages()
    |> generate_text(
      "amazon-bedrock:#{model}",
      bedrock.stream,
      request_opts(bedrock, model, Keyword.put(provider_options(bedrock), :tools, tools(opts)), opts)
    )
    |> reqllm_result()
  end

  @doc """
  Calls an openai tool call interface w/ strict mode
  """
  @spec tool_call(t(), Console.AI.Provider.history, [atom], keyword) :: {:ok, binary} | {:ok, [Console.AI.Tool.t]} | Console.error
  def tool_call(%__MODULE__{} = bedrock, messages, tools, opts) do
    model = select_model(bedrock, opts[:model], opts[:client] || :tool)
    provider_opts = Keyword.put(provider_options(bedrock), :tools, reqllm_tools(tools))

    messages
    |> reqllm_messages()
    |> generate_text(
      "amazon-bedrock:#{model}",
      bedrock.stream,
      request_opts(bedrock, model, provider_opts, opts)
    )
    |> reqllm_result()
    |> tool_calls()
  end

  def embeddings(%__MODULE__{} = bedrock, text) do
    bedrock = choose_region(bedrock)
    chunked = Utils.chunk(text, chunk_size("amazon-bedrock:#{bedrock.embedding_model}"))

    provider_options(bedrock)
    |> maybe_inference_profile(bedrock, bedrock.embedding_model)
    |> maybe_dims(bedrock.embedding_model)
    |> then(&ReqLLM.embed("amazon-bedrock:#{bedrock.embedding_model}", chunked, &1))
    |> case do
      {:ok, embeddings} ->
        maybe_truncate(embeddings, bedrock.embedding_model)
        |> then(&{:ok, Enum.zip(chunked, &1)})
      error -> error
    end
  end

  def context_window(%__MODULE__{model_id: model}) do
    case LLMDB.model("amazon-bedrock:#{model}") do
      {:ok, %LLMDB.Model{limits: %{context: context}}} -> context
      _ -> 500_000
    end
  end

  def tools?(), do: true

  def provider_options(%__MODULE__{region: region, access_token: token, endpoint: endpoint} = bedrock) do
    [region: region, api_key: token, endpoint: endpoint || :runtime]
    |> Enum.concat(if is_nil(token), do: aws_auth(bedrock), else: [])
    |> Enum.filter(fn {_, v} -> not is_nil(v) end)
  end

  defp choose_region(%__MODULE__{embedding_model: "cohere.embed-english-v3"} = rock),
    do: %{rock | region: "us-east-1"}
  defp choose_region(rock), do: rock

  defp maybe_dims(opts, "cohere.embed-english-v3"), do: opts
  defp maybe_dims(opts, _), do: Keyword.put(opts, :dimensions, Utils.embedding_dims())

  defp maybe_truncate(embeddings, "cohere.embed-english-v3"), do: Enum.map(embeddings, &Enum.take(&1, 512))
  defp maybe_truncate(embeddings, _), do: embeddings

  defp request_opts(bedrock, model, provider_opts, opts) do
    provider_opts
    |> base_opts(opts)
    |> maybe_inference_profile(bedrock, model)
    |> maybe_set_gpt56_reasoning_low(model)
  end

  defp maybe_inference_profile(opts, %__MODULE__{model_settings: settings}, model)
       when is_list(settings) and is_binary(model) do
    case Enum.find(settings, &matches_inference_profile_model?(&1, model)) do
      %{inference_profile_arn: arn} when is_binary(arn) ->
        Keyword.put(opts, :inference_profile_arn, arn)

      _ ->
        opts
    end
  end
  defp maybe_inference_profile(opts, _, _), do: opts

  defp matches_inference_profile_model?(%{model_id: configured}, model) do
    inference_profile_model_id(configured) == inference_profile_model_id(model)
  end
  defp matches_inference_profile_model?(_, _), do: false

  # ReqLLM preserves regional Bedrock inference-profile IDs for the provider's
  # native request format. Deployment settings intentionally use the portable
  # provider.model form, so compare those two equivalent forms for profile
  # lookup without changing the identifier passed to ReqLLM.
  defp inference_profile_model_id("us." <> model), do: model
  defp inference_profile_model_id(model), do: model

  defp maybe_set_gpt56_reasoning_low(opts, model) do
    if String.starts_with?(model, ["gpt-5.6", "openai.gpt-5.6"]) or
         String.contains?(model, ".openai.gpt-5.6") do
      Keyword.put(opts, :reasoning_effort, :low)
    else
      opts
    end
  end

  defp aws_auth(%__MODULE__{aws_access_key_id: aid, aws_secret_access_key: sak})
    when is_binary(aid) and is_binary(sak), do: [access_key_id: aid, secret_access_key: sak]
  defp aws_auth(_) do
    ExAws.Config.new("bedrock-runtime")
    |> Map.take([:access_key_id, :secret_access_key, :security_token])
    |> Console.move([:security_token], [:session_token])
    |> Map.to_list()
  end
end
