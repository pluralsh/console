defmodule Console.Devboxes.AgentCredentials do
  @moduledoc """
  The subscription credential store (DBX-56): users link their own Claude or Codex subscription, and devbox
  instances whose agents bill to it fetch the secret with `GetInstanceCredentials`.

  * Linking validates the secret's shape and makes one live check through `AgentCredentials.Verifier`.  Relinking
    the same provider replaces the secret.
  * The secret is write-only: nothing but `deliver/2` and `update/2` (both for the owner's own instances) reads it.
  * Codex `auth.json` bundles carry a rotating refresh token, so one instance at a time holds a refresh lease and is
    the only one that lets Codex refresh.  It writes the refreshed bundle back with `UpdateAgentCredential`, a
    compare-and-swap on `version`, and console fans the new bundle out to the owner's other instances.
  * Vendors' 401s reported by the gateway are counted, and the credential turns `invalid` after
    `AgentCredential.max_failures/0` in a row.  Expiring credentials warn their owner 30 and 7 days ahead.
  """
  use Console.Services.Base
  require Logger
  alias Console.Devboxes.{Billing, Control}
  alias Console.Devboxes.AgentCredentials.Verifier
  alias Console.Deployments.Notifications
  alias Console.Schema.{AgentCredential, DevboxInstance, User}

  @type error :: Console.error
  @type credential_resp :: {:ok, AgentCredential.t} | error

  @lease_ttl 15 * 60
  @warnings [{"30d", 30}, {"7d", 7}]

  def get_credential(id), do: Repo.get(AgentCredential, id)

  @doc "A user's linked credentials (metadata only, the secret is never exposed through graphql)"
  @spec list(User.t) :: [AgentCredential.t]
  def list(%User{id: uid}) do
    AgentCredential.for_user(uid)
    |> AgentCredential.ordered()
    |> Repo.all()
  end

  @doc "A user's valid credentials"
  @spec usable(binary) :: [AgentCredential.t]
  def usable(user_id) do
    AgentCredential.for_user(user_id)
    |> AgentCredential.for_status(:valid)
    |> Repo.all()
  end

  @doc """
  Links (or relinks) a subscription credential.  `attrs` takes `kind`, `secret`, `label`, `expires_at` (when the
  access token expires, for warnings) and `default_billing`.
  """
  @spec link(map, User.t) :: credential_resp
  def link(%{kind: kind, secret: secret} = attrs, %User{id: uid}) do
    provider = AgentCredential.provider(kind)
    start_transaction()
    |> add_operation(:shape, fn _ -> shape(kind, String.trim(secret)) end)
    |> add_operation(:verified, fn %{shape: meta} -> Verifier.verify(kind, String.trim(secret), meta) end)
    |> add_operation(:credential, fn %{verified: meta} ->
      existing = Repo.one(AgentCredential.for_user(uid) |> AgentCredential.for_provider(provider) |> AgentCredential.with_lock())
      now = DateTime.utc_now()
      (existing || %AgentCredential{user_id: uid})
      |> AgentCredential.changeset(%{
        provider: provider,
        kind: kind,
        secret: String.trim(secret),
        label: attrs[:label],
        metadata: meta,
        status: :valid,
        default_billing: Map.get(attrs, :default_billing, existing && existing.default_billing) || false,
        linked_at: now,
        last_refreshed_at: now,
        expires_at: attrs[:expires_at] || meta_expiry(meta)
      })
      |> relinked(existing)
      |> Repo.insert_or_update()
    end)
    |> execute(extract: :credential)
  end
  def link(_, _), do: {:error, "a credential kind and secret are required"}

  defp relinked(cs, nil), do: cs
  defp relinked(cs, %AgentCredential{version: v}) do
    cs
    |> Ecto.Changeset.put_change(:version, v + 1)
    |> Ecto.Changeset.put_change(:failure_count, 0)
    |> Ecto.Changeset.put_change(:warned_at, nil)
    |> Ecto.Changeset.put_change(:lease_holder_id, nil)
    |> Ecto.Changeset.put_change(:lease_expires_at, nil)
  end

  @doc """
  Validates a secret's shape before any network call, returning the non-secret metadata it carries.
  """
  @spec shape(atom, binary) :: {:ok, map} | error
  def shape(:claude_oauth_token, "sk-ant-oat" <> _ = token) when byte_size(token) >= 40 do
    case String.match?(token, ~r/^[A-Za-z0-9_\-]+$/) do
      true -> {:ok, %{}}
      false -> {:error, "this doesn't look like a Claude setup-token (run `claude setup-token`)"}
    end
  end
  def shape(:claude_oauth_token, _), do: {:error, "this doesn't look like a Claude setup-token (run `claude setup-token`)"}
  def shape(:codex_chatgpt_auth, json) do
    case Jason.decode(json) do
      {:ok, %{"tokens" => %{"access_token" => at, "refresh_token" => rt} = tokens}} when is_binary(at) and is_binary(rt) ->
        {:ok, %{"account_id" => tokens["account_id"]} |> Console.drop_nils() |> Map.merge(jwt_meta(tokens["id_token"]))}
      {:ok, _} -> {:error, "a Codex auth.json needs tokens.access_token and tokens.refresh_token (sign in with `codex login`)"}
      _ -> {:error, "a Codex auth.json must be valid JSON"}
    end
  end
  def shape(:codex_access_token, token) when byte_size(token) >= 20 do
    case String.match?(token, ~r/^\S+$/) do
      true -> {:ok, jwt_meta(token)}
      false -> {:error, "a Codex access token can't contain whitespace"}
    end
  end
  def shape(:codex_access_token, _), do: {:error, "this doesn't look like a Codex access token"}
  def shape(kind, _), do: {:error, "unsupported credential kind #{kind}"}

  defp jwt_meta(token) when is_binary(token) do
    with [_, payload, _] <- String.split(token, "."),
         {:ok, json} <- Base.url_decode64(payload, padding: false),
         {:ok, %{} = claims} <- Jason.decode(json) do
      auth = claims["https://api.openai.com/auth"] || %{}
      %{
        "email" => claims["email"],
        "plan" => auth["chatgpt_plan_type"],
        "account_id" => auth["chatgpt_account_id"],
        "exp" => claims["exp"]
      }
      |> Console.drop_nils()
    else
      _ -> %{}
    end
  end
  defp jwt_meta(_), do: %{}

  defp meta_expiry(%{"exp" => exp}) when is_integer(exp), do: DateTime.from_unix!(exp)
  defp meta_expiry(_), do: nil

  @doc "Unlinks a credential.  Instances billing to it fall back to failing auth until switched to the proxy."
  @spec delete(binary, User.t) :: credential_resp
  def delete(id, %User{id: uid}) do
    case get_credential(id) do
      %AgentCredential{user_id: ^uid} = cred -> Repo.delete(cred)
      _ -> {:error, "could not find that credential"}
    end
  end

  @doc """
  Sets whether new instances bill a provider's agent to the user's credential by default.
  """
  @spec set_default_billing(atom, boolean, User.t) :: credential_resp
  def set_default_billing(provider, enabled, %User{id: uid}) do
    case Repo.one(AgentCredential.for_user(uid) |> AgentCredential.for_provider(provider)) do
      %AgentCredential{} = cred ->
        cred
        |> AgentCredential.changeset(%{default_billing: enabled})
        |> Repo.update()
      nil -> {:error, "link a #{provider} subscription first"}
    end
  end

  @doc """
  The credential an instance's subscription-billed agent uses, for `GetInstanceCredentials` kinds `claude_oauth`
  and `codex`.  Only ever the instance owner's own credential, referenced by the instance's billing.
  """
  @spec deliver(DevboxInstance.t, :claude_oauth | :codex) :: {:ok, [map]} | error
  def deliver(%DevboxInstance{} = inst, kind) do
    agent = agent_for(kind)
    start_transaction()
    |> add_operation(:launch, fn _ -> subscription_launch(inst, agent) end)
    |> add_operation(:credential, fn %{launch: launch} -> owned_credential(inst, launch.credential_id) end)
    |> add_operation(:lease, fn %{credential: cred} -> maybe_lease(cred, inst) end)
    |> add_operation(:used, fn %{lease: cred} ->
      AgentCredential.usage_changeset(cred, %{last_used_at: DateTime.utc_now()})
      |> Repo.update()
    end)
    |> execute(extract: :used)
    |> when_ok(&[credential(&1, inst)])
  end

  defp agent_for(:claude_oauth), do: :claude
  defp agent_for(:codex), do: :codex

  defp subscription_launch(inst, agent) do
    case Billing.for_agent(inst, agent) do
      %{billing: :subscription, credential_id: id} = launch when is_binary(id) -> {:ok, launch}
      _ -> {:error, "the #{agent} agent of this instance doesn't bill to a subscription"}
    end
  end

  defp owned_credential(%DevboxInstance{user_id: uid}, id) do
    case Repo.get(AgentCredential.with_lock(), id) do
      %AgentCredential{user_id: ^uid, status: :valid} = cred -> {:ok, cred}
      %AgentCredential{user_id: ^uid, status: status} -> {:error, "the instance owner's subscription credential is #{status}, relink it"}
      _ -> {:error, "the instance owner's subscription credential is no longer linked"}
    end
  end

  defp maybe_lease(%AgentCredential{kind: :codex_chatgpt_auth} = cred, %DevboxInstance{id: id}) do
    now = DateTime.utc_now()
    case lease_free?(cred, id, now) do
      true ->
        cred
        |> AgentCredential.lease_changeset(%{lease_holder_id: id, lease_expires_at: DateTime.add(now, @lease_ttl, :second)})
        |> Repo.update()
      false -> {:ok, cred}
    end
  end
  defp maybe_lease(cred, _), do: {:ok, cred}

  defp lease_free?(%AgentCredential{lease_holder_id: nil}, _, _), do: true
  defp lease_free?(%AgentCredential{lease_holder_id: id}, id, _), do: true
  defp lease_free?(%AgentCredential{lease_expires_at: %DateTime{} = exp}, _, now), do: DateTime.compare(exp, now) != :gt
  defp lease_free?(_, _, _), do: true

  @doc """
  An `InstanceCredential` map for a credential, as seen by one instance (lease holder or not).
  """
  @spec credential(AgentCredential.t, DevboxInstance.t) :: map
  def credential(%AgentCredential{kind: :claude_oauth_token} = cred, _) do
    %{
      kind: :claude_oauth,
      host: "api.anthropic.com",
      token: cred.secret,
      header_name: "Authorization",
      header_format: "Bearer %s",
      expires_at: cred.expires_at,
      credential_id: cred.id,
      version: cred.version,
      metadata: public_metadata(cred)
    }
  end
  def credential(%AgentCredential{kind: :codex_access_token} = cred, _) do
    %{
      kind: :codex,
      codex_mode: :access_token,
      token: cred.secret,
      expires_at: cred.expires_at,
      credential_id: cred.id,
      version: cred.version,
      metadata: public_metadata(cred)
    }
  end
  def credential(%AgentCredential{kind: :codex_chatgpt_auth} = cred, %DevboxInstance{id: id}) do
    holder = cred.lease_holder_id == id
    %{
      kind: :codex,
      codex_mode: :chatgpt_auth,
      bundle_json: bundle(cred.secret, holder),
      credential_id: cred.id,
      version: cred.version,
      refresh_lease_holder: holder,
      lease_expires_at: holder && cred.lease_expires_at || nil,
      expires_at: cred.expires_at,
      metadata: public_metadata(cred)
    }
  end

  # instances without the refresh lease get a fresh `last_refresh` so codex never refreshes (and burns the rotating
  # refresh token) on its own
  defp bundle(secret, true), do: secret
  defp bundle(secret, false) do
    case Jason.decode(secret) do
      {:ok, %{} = auth} -> Jason.encode!(Map.put(auth, "last_refresh", DateTime.to_iso8601(DateTime.utc_now())))
      _ -> secret
    end
  end

  defp public_metadata(%AgentCredential{metadata: meta, provider: provider}),
    do: Map.merge(Map.take(meta || %{}, ~w(email plan account_id)), %{"provider" => to_string(provider)})

  @doc """
  `UpdateAgentCredential`: the lease holder writes back a bundle Codex refreshed.  A compare-and-swap on the
  version: a stale version (or a caller without the lease) isn't applied and gets the current bundle instead.  An
  applied update renews the lease and is pushed to the owner's other live instances using the credential.
  """
  @spec update(DevboxInstance.t, map) :: {:ok, %{applied: boolean, current: map}} | error
  def update(%DevboxInstance{} = inst, %{credential_id: id, expected_version: v, bundle_json: bundle} = attrs) do
    start_transaction()
    |> add_operation(:credential, fn _ -> owned_credential(inst, id) end)
    |> add_operation(:billed, fn %{credential: cred} -> billed_to?(inst, cred) end)
    |> add_operation(:kind, fn %{credential: cred} -> refreshable(cred) end)
    |> add_operation(:shape, fn _ -> shape(:codex_chatgpt_auth, bundle) end)
    |> add_operation(:result, fn %{credential: cred, shape: meta} ->
      case {cred.version == v, cred.lease_holder_id == inst.id} do
        {true, true} -> refresh(cred, bundle, meta, attrs[:refreshed_at])
        _ -> {:ok, %{applied: false, credential: cred}}
      end
    end)
    |> execute(extract: :result)
    |> when_ok(fn
      %{applied: true, credential: cred} ->
        fan_out(cred, inst)
        %{applied: true, current: credential(cred, inst)}
      %{applied: false, credential: cred} -> %{applied: false, current: credential(cred, inst)}
    end)
  end
  def update(_, _), do: {:error, "credential_id, expected_version and bundle_json are required"}

  defp billed_to?(inst, %AgentCredential{id: id}) do
    case Enum.any?(Billing.launches(inst), & &1.credential_id == id) do
      true -> {:ok, true}
      false -> {:error, "this instance doesn't bill to that credential"}
    end
  end

  defp refreshable(%AgentCredential{kind: :codex_chatgpt_auth}), do: {:ok, true}
  defp refreshable(%AgentCredential{kind: kind}), do: {:error, "#{kind} credentials aren't refreshed by instances"}

  defp refresh(cred, bundle, meta, refreshed_at) do
    now = DateTime.utc_now()
    with {:ok, cred} <- AgentCredential.refresh_changeset(cred, %{
                          secret: bundle,
                          metadata: Map.merge(cred.metadata || %{}, meta),
                          expires_at: meta_expiry(meta) || cred.expires_at,
                          last_refreshed_at: refreshed_at || now
                        }) |> Repo.update(),
         {:ok, cred} <- AgentCredential.lease_changeset(cred, %{lease_expires_at: DateTime.add(now, @lease_ttl, :second)}) |> Repo.update(),
      do: {:ok, %{applied: true, credential: cred}}
  end

  @doc """
  Pushes a refreshed credential to the owner's other live instances billing to it.  Best effort: an instance that
  misses the push gets the new version with its next `GetInstanceCredentials` or CAS rejection.
  """
  @spec fan_out(AgentCredential.t, DevboxInstance.t | nil) :: :ok
  def fan_out(%AgentCredential{id: id, user_id: uid} = cred, source) do
    DevboxInstance.for_user(uid)
    |> DevboxInstance.live()
    |> Repo.all()
    |> Enum.filter(fn inst -> (!source || inst.id != source.id) && Enum.any?(Billing.launches(inst), & &1.credential_id == id) end)
    |> Enum.each(fn inst ->
      case Control.push_credential(inst, credential(cred, inst)) do
        {:error, err} -> Logger.info("could not push agent credential #{id} to devbox instance #{inst.id}: #{inspect(err)}")
        _ -> :ok
      end
    end)
  end

  @doc """
  Records a vendor 401 for an instance's subscription-billed agent.  After `AgentCredential.max_failures/0` in a row
  the credential turns `invalid` and its owner is notified to relink it.
  """
  @spec record_auth_failure(DevboxInstance.t, atom) :: credential_resp | {:ok, nil}
  def record_auth_failure(%DevboxInstance{} = inst, agent) do
    with %{billing: :subscription, credential_id: id} when is_binary(id) <- Billing.for_agent(inst, agent),
         %AgentCredential{status: :valid} = cred <- get_credential(id) do
      count = cred.failure_count + 1
      status = if count >= AgentCredential.max_failures(), do: :invalid, else: :valid
      cred
      |> AgentCredential.usage_changeset(%{failure_count: count, status: status})
      |> Repo.update()
      |> notify_invalid()
    else
      _ -> {:ok, nil}
    end
  end

  @doc "Resets the failure count after the agent authenticated again"
  @spec record_auth_success(DevboxInstance.t, atom) :: credential_resp | {:ok, nil}
  def record_auth_success(%DevboxInstance{} = inst, agent) do
    with %{billing: :subscription, credential_id: id} when is_binary(id) <- Billing.for_agent(inst, agent),
         %AgentCredential{failure_count: n} = cred when n > 0 <- get_credential(id) do
      cred
      |> AgentCredential.usage_changeset(%{failure_count: 0})
      |> Repo.update()
    else
      _ -> {:ok, nil}
    end
  end

  defp notify_invalid({:ok, %AgentCredential{status: :invalid} = cred}) do
    Notifications.create_notifications([%{
      priority: :high,
      user_id: cred.user_id,
      text: "Your #{cred.provider} subscription credential was rejected #{cred.failure_count} times and was disabled, relink it to keep billing devbox agents to it"
    }])
    {:ok, cred}
  end
  defp notify_invalid(pass), do: pass

  @doc """
  Warns owners of credentials expiring within 30 and 7 days (once each), and marks expired credentials.  Run on a
  cron.
  """
  @spec warn_expiring() :: :ok
  def warn_expiring() do
    now = DateTime.utc_now()
    AgentCredential.expiring_before(DateTime.add(now, 30, :day))
    |> AgentCredential.for_status(:valid)
    |> Repo.all()
    |> Enum.each(&warn(&1, now))
  end

  defp warn(%AgentCredential{expires_at: exp} = cred, now) do
    days = DateTime.diff(exp, now, :second) / 86_400
    case {days <= 0, next_warning(cred, days)} do
      {true, _} -> AgentCredential.usage_changeset(cred, %{status: :expired}) |> Repo.update()
      {_, nil} -> {:ok, cred}
      {_, key} ->
        Notifications.create_notifications([%{
          priority: :medium,
          user_id: cred.user_id,
          text: "Your #{cred.provider} subscription credential for devbox agents expires in #{ceil(days)} days, relink it to avoid interruptions"
        }])
        AgentCredential.usage_changeset(cred, %{warned_at: Map.put(cred.warned_at || %{}, key, DateTime.to_iso8601(now))})
        |> Repo.update()
    end
  end

  defp next_warning(%AgentCredential{warned_at: warned}, days) do
    @warnings
    |> Enum.filter(fn {_, d} -> days <= d end)
    |> Enum.min_by(fn {_, d} -> d end, fn -> nil end)
    |> case do
      {key, _} -> if Map.has_key?(warned || %{}, key), do: nil, else: key
      nil -> nil
    end
  end
end
