defmodule Console.Devboxes.Billing do
  @moduledoc """
  Per-agent billing for devbox instances (DBX-56).  An instance's `agent_billing` maps an agent type to how its
  ACP connection is billed:

      %{"claude" => %{"billing" => "subscription", "credential_id" => "...", "credential_kind" => "claude_oauth_token",
                      "allow_collaborators" => false}}

  Agents not listed bill to the AI proxy (and the workbench budget).  Subscription billing uses the instance owner's
  linked `AgentCredential` and is only allowed when the workbench sets `allowSubscriptionCredentials`.  Other users
  can only prompt a subscription-backed agent when the owner opted in with `allow_collaborators`.
  """
  use Console.Services.Base
  import Console.Deployments.Policies
  alias Console.Deployments.Workbenches
  alias Console.Devboxes.{AgentCredentials, Credentials}
  alias Console.Schema.{AgentCredential, Devbox, DevboxInstance, User, Workbench}

  @type launch :: %{
    agent: atom,
    billing: :proxy | :subscription,
    credential_id: binary | nil,
    credential_kind: binary | nil,
    allow_collaborators: boolean
  }

  @doc """
  Normalizes one `agent_billing` entry (a legacy `"proxy"`/`"subscription"` string or a map) into a launch.
  """
  @spec launch(atom | binary, binary | map | nil) :: launch
  def launch(agent, entry) when is_binary(entry) or is_atom(entry), do: launch(agent, %{"billing" => entry})
  def launch(agent, %{} = entry) do
    %{
      agent: agent_type(agent),
      billing: billing_mode(get(entry, :billing)),
      credential_id: get(entry, :credential_id),
      credential_kind: kind_string(get(entry, :credential_kind)),
      allow_collaborators: get(entry, :allow_collaborators) == true
    }
  end

  @doc "All of an instance's agent launches"
  @spec launches(DevboxInstance.t) :: [launch]
  def launches(%DevboxInstance{agent_billing: %{} = billing}), do: Enum.map(billing, fn {a, e} -> launch(a, e) end)
  def launches(_), do: []

  @doc "The launch for one agent of an instance (AI proxy when it isn't listed)"
  @spec for_agent(DevboxInstance.t, atom | binary) :: launch
  def for_agent(%DevboxInstance{agent_billing: %{} = billing}, agent) do
    a = to_string(agent)
    Enum.find_value(billing, launch(agent, "proxy"), fn {k, v} -> to_string(k) == a && launch(k, v) end)
  end
  def for_agent(_, agent), do: launch(agent, "proxy")

  @spec subscription?(DevboxInstance.t, atom | binary) :: boolean
  def subscription?(inst, agent), do: for_agent(inst, agent).billing == :subscription

  @doc """
  Whether instances on a workbench may bill agents to subscriptions.
  """
  @spec allowed?(Workbench.t | nil) :: boolean
  def allowed?(%Workbench{configuration: %{devbox: %{allow_subscription_credentials: true}}}), do: true
  def allowed?(_), do: false

  @doc """
  Resolves the `agent_billing` of a new instance from the requested entries (`[%{agent, billing,
  allow_collaborators}]`).  With no request, agents whose provider credential the owner marked `default_billing`
  bill to it when the workbench allows.  Validates each subscription entry against the owner's credential and the
  workbench policy.
  """
  @spec resolve(Devbox.t, Workbench.t, User.t, [map] | nil) :: {:ok, map | nil} | Console.error
  def resolve(%Devbox{} = devbox, %Workbench{} = wb, %User{} = user, requested) do
    creds = AgentCredentials.usable(user.id)
    requested
    |> entries(devbox, creds, allowed?(wb))
    |> Enum.reduce_while({:ok, %{}}, fn entry, {:ok, acc} ->
      case resolve_entry(entry, devbox, creds, wb) do
        {:ok, nil} -> {:cont, {:ok, acc}}
        {:ok, {agent, launch}} -> {:cont, {:ok, Map.put(acc, agent, launch)}}
        err -> {:halt, err}
      end
    end)
    |> when_ok(fn
      empty when map_size(empty) == 0 -> nil
      billing -> billing
    end)
  end

  defp entries(nil, devbox, creds, true) do
    Enum.flat_map(devbox.agents || [], fn %Devbox.Agent{type: type} ->
      case Enum.find(creds, & &1.default_billing && &1.provider == provider(type)) do
        %AgentCredential{} -> [%{agent: type, billing: :subscription}]
        nil -> []
      end
    end)
  end
  defp entries(nil, _, _, _), do: []
  defp entries(requested, _, _, _), do: requested

  defp resolve_entry(%{agent: agent} = entry, devbox, creds, wb) do
    type = agent_type(agent)
    with %Devbox.Agent{} <- (type && Devbox.agent(devbox, type)) || {:error, "agent #{agent} is not offered by devbox #{devbox.name}"} do
      case billing_mode(entry[:billing]) do
        :proxy -> {:ok, nil}
        :subscription -> subscription_entry(type, entry, creds, wb)
      end
    end
  end

  defp subscription_entry(agent, entry, creds, wb) do
    provider = provider(agent)
    with true <- allowed?(wb) || {:error, "this workbench doesn't allow subscription credentials"},
         true <- !!provider || {:error, "the #{agent} agent can't bill to a subscription"},
         %AgentCredential{} = cred <- Enum.find(creds, & &1.provider == provider) ||
                                        {:error, "link a #{provider} subscription before billing the #{agent} agent to it"} do
      {:ok, {to_string(agent), %{
        "billing" => "subscription",
        "credential_id" => cred.id,
        "credential_kind" => to_string(cred.kind),
        "allow_collaborators" => entry[:allow_collaborators] == true
      }}}
    end
  end

  @doc """
  Gates a prompt on an instance's agent: a subscription-backed agent may only be prompted by the instance's owner
  unless they opted collaborators in, and a proxy-billed agent needs workbench budget.
  """
  @spec check(DevboxInstance.t, atom | binary, User.t) :: {:ok, DevboxInstance.t} | Console.error
  def check(%DevboxInstance{} = inst, agent, %User{} = user) do
    case {for_agent(inst, agent), inst.user_id == user.id} do
      {%{billing: :subscription}, true} -> {:ok, inst}
      {%{billing: :subscription, allow_collaborators: true}, _} -> {:ok, inst}
      {%{billing: :subscription}, _} ->
        {:error, "this agent bills to its owner's subscription and they haven't allowed collaborators to prompt it"}
      _ -> check_budget(inst)
    end
  end

  defp check_budget(%DevboxInstance{} = inst) do
    case Credentials.budget_available?(workbench(inst)) do
      true -> {:ok, inst}
      false -> {:error, "workbench budget is exhausted"}
    end
  end

  defp workbench(%DevboxInstance{workbench: %Workbench{} = wb}), do: wb
  defp workbench(%DevboxInstance{workbench_id: id}), do: Workbenches.get_workbench!(id)

  @doc """
  Switches one agent of a running instance between proxy and subscription billing.  Owner only.
  """
  @spec update(DevboxInstance.t, map, User.t) :: {:ok, DevboxInstance.t} | Console.error
  def update(%DevboxInstance{user_id: uid} = inst, %{agent: agent} = entry, %User{id: uid} = user) do
    inst = Console.Repo.preload(inst, [:devbox, :workbench])
    type = to_string(agent_type(agent))
    with {:ok, resolved} <- resolve_entry(entry, inst.devbox, AgentCredentials.usable(uid), inst.workbench) do
      billing = Map.new(inst.agent_billing || %{}, fn {k, v} -> {to_string(k), v} end)
      billing = case resolved do
        {k, launch} -> Map.put(billing, k, launch)
        nil -> Map.delete(billing, type)
      end
      DevboxInstance.changeset(inst, %{agent_billing: billing})
      |> allow(user, :prompt)
      |> when_ok(:update)
    end
  end
  def update(_, _, _), do: {:error, "only the instance's owner can change its billing"}

  @doc "The subscription provider an agent bills to"
  @spec provider(atom | binary) :: atom | nil
  def provider(:claude), do: :claude
  def provider(:codex), do: :codex
  def provider(a) when is_binary(a), do: provider(agent_type(a))
  def provider(_), do: nil

  defp agent_type(a) when is_atom(a), do: a
  defp agent_type(a) when is_binary(a) do
    Enum.find(Devbox.AgentType.__valid_values__(), &(is_atom(&1) && to_string(&1) == a))
  end

  defp billing_mode(m) when m in [:subscription, "subscription", "SUBSCRIPTION"], do: :subscription
  defp billing_mode(_), do: :proxy

  defp kind_string(nil), do: nil
  defp kind_string(k), do: to_string(k)

  defp get(map, key), do: Map.get(map, key, Map.get(map, to_string(key)))
end
