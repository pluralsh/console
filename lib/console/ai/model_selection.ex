defmodule Console.AI.ModelSelection do
  alias Console.Schema.{
    AIUsage,
    AgentRun,
    AgentRuntime,
    DeploymentSettings,
    Workbench,
    WorkbenchJob
  }

  @tokens_per_million 1_000_000

  @doc """
  Resolves the provider and model used for workbench tool calls.

  A workbench job's model override takes precedence over the configured tool model.
  """
  @spec tool_model(WorkbenchJob.t(), DeploymentSettings.t() | nil) :: %{provider: atom, model: binary} | nil
  def tool_model(%WorkbenchJob{modes: %{model: model}} = job, settings) do
    model_info(model) || settings_tool_model(job, settings)
  end
  def tool_model(%WorkbenchJob{} = job, settings), do: settings_tool_model(job, settings)

  defp settings_tool_model(%WorkbenchJob{}, %DeploymentSettings{ai: %{provider: provider} = ai}) do
    provider = ai.tool_provider || provider

    with config when is_map(config) <- Map.get(ai, provider),
         model when is_binary(model) <- Map.get(config, :tool_model) || Map.get(config, :tool_model_id) do
      %{provider: provider, model: model}
    else
      _ -> nil
    end
  end
  defp settings_tool_model(_, _), do: nil

  @doc """
  Resolves the provider and model used by an agent runtime.

  Coding-agent runs report token counts but often omit cost. This is the model those
  tokens should be attributed against when a price sheet is configured.
  """
  @spec runtime_model(term) :: %{provider: atom, model: binary} | nil
  def runtime_model(%AgentRun{runtime: runtime}), do: runtime_model(runtime)
  def runtime_model(%WorkbenchJob{workbench: workbench}), do: runtime_model(workbench)
  def runtime_model(%Workbench{agent_runtime: runtime}), do: runtime_model(runtime)
  def runtime_model(%AgentRuntime{model: model}), do: model_info(model)
  def runtime_model(_), do: nil

  defp model_info(%{provider: provider, model: model})
       when is_atom(provider) and is_binary(model),
       do: %{provider: provider, model: model}
  defp model_info(_), do: nil

  @doc """
  Finds the configured price sheet for a provider and model.
  """
  @spec price_sheet(DeploymentSettings.t() | nil, atom, binary) :: map | nil
  def price_sheet(%DeploymentSettings{ai: %{price_sheets: [_ | _] = sheets}}, provider, model) do
    Enum.find(sheets, &(Map.get(&1, :provider) == provider and Map.get(&1, :model) == model))
  end
  def price_sheet(_, _, _), do: nil

  @doc """
  Adds missing usage costs using a previously resolved price sheet.
  """
  @spec backfill_usage(map, map | nil) :: map
  def backfill_usage(usage, %{input_price: input_price, output_price: output_price}) when is_map(usage) do
    usage = AIUsage.sanitize(usage)

    usage
    |> put_cost(:input_cost, usage[:input_tokens], input_price)
    |> put_cost(:output_cost, usage[:output_tokens], output_price)
    |> put_total_cost()
  end

  def backfill_usage(usage, _), do: AIUsage.sanitize(usage)

  defp put_cost(usage, cost_key, tokens, price) do
    case usage[cost_key] do
      nil when is_integer(tokens) and is_number(price) ->
        Map.put(usage, cost_key, tokens * price / @tokens_per_million)

      _ ->
        usage
    end
  end

  defp put_total_cost(%{total_cost: total_cost} = usage) when not is_nil(total_cost), do: usage
  defp put_total_cost(%{input_cost: input_cost, output_cost: output_cost} = usage)
      when is_number(input_cost) and is_number(output_cost),
      do: Map.put(usage, :total_cost, input_cost + output_cost)
  defp put_total_cost(usage), do: usage
end
