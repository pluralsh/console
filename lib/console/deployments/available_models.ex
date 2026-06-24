defmodule Console.Deployments.AvailableModels do
  alias Console.AI.Provider
  alias Console.Schema.DeploymentSettings
  alias Console.Schema.DeploymentSettings.AI

  defmodule Model do
    defstruct [:provider, :model]
  end

  @providers [:openai, :openai_compatible, :anthropic, :vertex, :bedrock, :azure]

  @spec list(DeploymentSettings.t() | nil) :: [Model.t()]
  def list(%DeploymentSettings{ai: %AI{enabled: true} = ai}) do
    Enum.flat_map(@providers, &models(ai, &1))
  end

  def list(_), do: []

  defp models(%AI{} = ai, provider) do
    case Map.get(ai, provider) do
      %{} = config ->
        provider
        |> configured_models(config)
        |> normalize()
        |> Enum.map(&%Model{provider: provider, model: &1})

      _ ->
        []
    end
  end

  defp configured_models(:openai, config), do: openai_models(:openai, config)
  defp configured_models(:openai_compatible, config), do: openai_models(:openai, config)

  defp configured_models(:anthropic, config) do
    defaults = Provider.defaults(:anthropic)

    [
      Map.get(config, :model) || defaults[:model],
      Map.get(config, :tool_model) || defaults[:tool_model]
      | proxy_models(config)
    ]
  end

  defp configured_models(:vertex, config) do
    defaults = Provider.defaults(:vertex)

    [
      Map.get(config, :model) || defaults[:model],
      Map.get(config, :tool_model) || defaults[:tool_model]
      | proxy_models(config)
    ]
  end

  defp configured_models(:bedrock, config) do
    defaults = Provider.defaults(:bedrock)

    [
      Map.get(config, :model_id) || defaults[:model],
      Map.get(config, :tool_model_id) || defaults[:tool_model]
      | proxy_models(config)
    ]
  end

  defp configured_models(:azure, config) do
    defaults = Provider.defaults(:azure)

    [
      Map.get(config, :model) || defaults[:model],
      Map.get(config, :tool_model) || defaults[:tool_model]
      | proxy_models(config)
    ]
  end

  defp openai_models(default_provider, config) do
    defaults = Provider.defaults(default_provider)

    [
      Map.get(config, :model) || defaults[:model],
      Map.get(config, :tool_model) || defaults[:tool_model]
      | proxy_models(config)
    ]
  end

  defp proxy_models(%{proxy_models: models}) when is_list(models), do: models
  defp proxy_models(_), do: []

  defp normalize(models) do
    models
    |> List.flatten()
    |> Enum.filter(&(is_binary(&1) && String.trim(&1) != ""))
    |> Enum.uniq()
  end
end
