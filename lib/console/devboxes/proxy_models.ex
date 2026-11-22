defmodule Console.Devboxes.ProxyModels do
  @moduledoc """
  The console AI proxy models each devbox agent may use, derived from the deployment settings' AI providers (the
  same list the proxy allows).  IDs are `provider/model`, which the proxy routes on.  The primary provider's
  models come first, and within a provider its tool model leads (it's tuned for the agentic, tool-calling work
  devboxes do), so the primary provider's tool model is each agent's default.

  Claude Code picks models by tier alias (`opus`, `sonnet`, `haiku`) for its Default and background work, so Claude
  also gets those aliases resolved to proxy models, falling back to the nearest tier the proxy serves.  Its picker
  offers every proxy model, since the proxy's Anthropic route translates to any provider; Claude models come first.
  """
  alias Console.Deployments.{AvailableModels, Settings}
  alias Console.Schema.{DeploymentSettings, Devbox}

  @type t :: %{default_model: binary | nil, models: [binary], aliases: %{binary => binary}}

  @prefixes %{
    openai: "openai",
    openai_compatible: "openai-compatible",
    xai: "xai",
    anthropic: "anthropic",
    vertex: "vertex",
    bedrock: "bedrock",
    azure: "azure"
  }

  # providers each harness can drive through the proxy endpoint it's pointed at
  @agent_providers %{
    claude: :all,
    codex: ~w(openai openai_compatible azure)a,
    gemini: ~w(vertex)a,
    opencode: :all,
    pi: :all
  }

  # harnesses the daemon registers the proxy models with, so their pickers list them
  @registered ~w(claude codex opencode pi)a

  # only these model families speak each harness's native API
  @agent_families %{gemini: "gemini"}
  # families a harness runs best on, offered first
  @agent_preferred %{claude: "claude"}

  @tiers ~w(opus sonnet haiku)
  @tier_fallbacks %{
    "opus" => ~w(opus sonnet haiku),
    "sonnet" => ~w(sonnet opus haiku),
    "haiku" => ~w(haiku sonnet opus)
  }

  @spec for_agent(atom | binary, DeploymentSettings.t | nil | :fetch) :: t | nil
  def for_agent(agent, settings \\ :fetch)
  def for_agent(agent, :fetch), do: for_agent(agent, Settings.fetch())
  def for_agent(agent, settings) do
    agent = agent_type(agent)
    case models(agent, settings) do
      [default | _] = models -> %{default_model: default, models: models, aliases: aliases(agent, models)}
      [] -> nil
    end
  end

  @doc """
  The model a devbox writes pull requests with through the proxy: the primary provider's tool model, or nil when
  console AI is off.
  """
  @spec writer_model(DeploymentSettings.t | nil | :fetch) :: binary | nil
  def writer_model(settings \\ :fetch)
  def writer_model(:fetch), do: writer_model(Settings.fetch())
  def writer_model(settings) do
    case models(:pi, settings) do
      [model | _] -> model
      [] -> nil
    end
  end

  @doc """
  The models a proxy-billed agent offers.  The proxy models are the source of truth for every agent the daemon
  registers them with (Claude's `availableModels`, Codex's model catalog, OpenCode's and Pi's `plural` provider):
  the box's probe ran without them, so its catalog only holds each harness's built-in models.  A runner allowlist
  naming proxy IDs still applies.  Gemini CLI's model list is hardcoded, so it keeps the probed models the proxy
  serves, if any match.  An agent the proxy serves nothing for keeps its probed models.
  """
  @spec narrow(Devbox.Agent.t, [binary], t | nil) :: [binary]
  def narrow(_, offered, nil), do: offered
  def narrow(%Devbox.Agent{type: type, allowed_models: allowed}, _, %{models: models}) when type in @registered do
    allowed = Enum.map(allowed || [], &String.replace_prefix(&1, "plural/", ""))
    case Enum.filter(models, &(&1 in allowed)) do
      [] -> models
      allowed -> allowed
    end
  end
  def narrow(_, offered, %{models: models}) do
    case Enum.filter(offered, &served?(&1, models)) do
      [] -> offered
      served -> served
    end
  end

  defp served?(id, models) do
    bare = String.replace_prefix(id, "plural/", "")
    Enum.any?(models, &(&1 == bare || String.ends_with?(&1, "/" <> bare)))
  end

  defp models(agent, %DeploymentSettings{ai: %{provider: primary}} = settings) do
    allowed = Map.get(@agent_providers, agent, [])
    family = Map.get(@agent_families, agent)
    preferred = Map.get(@agent_preferred, agent)

    settings
    |> AvailableModels.list()
    |> Enum.filter(&(allowed == :all || &1.provider in allowed))
    |> Enum.filter(&(family == nil || String.contains?(String.downcase(&1.model), family)))
    |> Enum.sort_by(&{preferred != nil && !String.contains?(String.downcase(&1.model), preferred), &1.provider != primary, !&1.tool})
    |> Enum.map(&"#{@prefixes[&1.provider]}/#{&1.model}")
    |> Enum.uniq()
  end
  defp models(_, _), do: []

  defp aliases(:claude, [default | _] = models) do
    Map.new(@tiers, fn t ->
      {t, Enum.find_value(@tier_fallbacks[t], default, fn f -> Enum.find(models, &(tier(&1) == f)) end)}
    end)
  end
  defp aliases(_, _), do: %{}

  defp tier(id) do
    id = String.downcase(id)
    Enum.find(@tiers, &String.contains?(id, &1))
  end

  defp agent_type(a) when is_atom(a), do: a
  defp agent_type(a) when is_binary(a), do: Enum.find(Map.keys(@agent_providers), &(to_string(&1) == a))
end
