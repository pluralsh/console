defmodule Console.Devboxes.Credentials do
  @moduledoc """
  Instance-scoped devbox credentials (DBX-12).  Everything is minted per instance and dies with it:

    * ai proxy and console tokens are JWTs of type `devbox` whose subject is the instance, carrying its workbench and
      the `scopes` they reach: `ai_proxy` for ai proxy tokens, `ai_proxy` and `workbench_mcp` (the instance's own
      workbench MCP, as its owner, `ConsoleWeb.Plugs.DevboxToken`) for console tokens.  They only verify while the
      instance is live and its credentials aren't revoked, and are never a console login (`Console.Guardian` rejects
      them): egress injects console tokens on every request to the console host, which anyone with a terminal on the
      instance can make;
    * scm tokens come from the box's scm connections (or the default one), as for agent runs, one per connection
      host, as the complete `Authorization` credential for git and the provider's API (basic `user:token` for
      github, gitlab, bitbucket and azure devops);
    * oidc tokens are workload identity JWTs from the box's issuer (`Console.WorkloadIdentity`), one per cloud
      identity, which cloud accounts exchange directly for their own short-lived credentials;
    * `claude_oauth` and `codex` are the instance owner's linked subscription (`Console.Devboxes.AgentCredentials`),
      for agents billed to it.
  """
  use Console.Services.Base
  import Console.Deployments.Pr.Git, only: [backfill_token: 1, normalize_url: 1]
  alias Console.AI.Tool
  alias Console.Devboxes.{AgentCredentials, Error}
  alias Console.WorkloadIdentity
  alias Console.WorkloadIdentity.Scopes.Devboxes, as: DevboxScope
  alias Console.Schema.{Devbox, DevboxInstance, ScmConnection, Workbench}

  @ttl 60 * 60
  @refresh_ahead 10 * 60
  @typ "devbox"
  @scopes ~w(ai_proxy workbench_mcp)

  @type credential :: %{
    optional(:metadata) => map,
    kind: atom,
    token: binary,
    host: binary | nil,
    header_name: binary,
    header_format: binary,
    expires_at: DateTime.t,
    refresh_after: DateTime.t
  }

  @spec ttl() :: integer
  def ttl(), do: @ttl

  @doc """
  The JWT `typ` of devbox tokens.
  """
  @spec token_type() :: binary
  def token_type(), do: @typ

  @doc """
  Mints a box-scoped probe token, used by the operator's catalog probe.
  """
  @spec mint_probe_token(Devbox.t) :: {:ok, binary, DateTime.t} | Console.error
  def mint_probe_token(%Devbox{} = devbox), do: sign(devbox, %{"scopes" => ["probe"]})

  @doc """
  Mints an instance-scoped ai proxy token.
  """
  @spec mint_ai_proxy_token(DevboxInstance.t) :: {:ok, binary, DateTime.t} | Console.error
  def mint_ai_proxy_token(%DevboxInstance{} = inst), do: instance_token(inst, ["ai_proxy"])

  @doc """
  Mints an instance-scoped console token, for the AI proxy and the instance's workbench MCP.
  """
  @spec console_token(DevboxInstance.t) :: {:ok, binary, DateTime.t} | Console.error
  def console_token(%DevboxInstance{} = inst), do: instance_token(inst, @scopes)

  defp instance_token(%DevboxInstance{workbench_id: wb_id} = inst, scopes),
    do: sign(inst, %{"workbench_id" => wb_id, "scopes" => scopes})

  defp sign(resource, claims) do
    with {:ok, token, %{"exp" => exp}} <- Console.Guardian.encode_and_sign(resource, claims, token_type: @typ, ttl: {@ttl, :second}),
      do: {:ok, token, DateTime.from_unix!(exp)}
  end

  @doc """
  Verifies an instance token for one of its scopes (`ai_proxy` or `workbench_mcp`), returning the live instance with
  its owner and workbench preloaded.
  """
  @spec verify(binary, binary) :: {:ok, DevboxInstance.t} | Console.error
  def verify(token, scope) when scope in @scopes do
    with {:ok, %{"sub" => "devbox_instance:" <> id, "scopes" => scopes} = claims} <-
           Console.Guardian.decode_and_verify(token, %{"typ" => @typ}),
         true <- scope in scopes,
         %DevboxInstance{workbench_id: wb_id} = inst <- Repo.get(DevboxInstance, id),
         true <- claims["workbench_id"] == wb_id do
      if live?(inst), do: {:ok, Repo.preload(inst, [:workbench, :user])}, else: {:error, "devbox instance has ended"}
    else
      _ -> {:error, "invalid devbox token"}
    end
  end

  @doc """
  Verifies a token presented to the AI proxy by a devbox instance, returning the instance with the workbench
  preloaded.  Accepts the instance's ai proxy and console tokens: egress injects the console token on the console
  host, which also serves the AI proxy unless it has a host of its own.  Fails when the instance has ended or its
  workbench budget is exhausted.
  """
  @spec verify_ai_proxy(binary) :: {:ok, DevboxInstance.t} | Console.error
  def verify_ai_proxy(token) when is_binary(token) do
    with {:ok, inst} <- verify(token, "ai_proxy"),
      do: verify_instance(inst)
  end
  def verify_ai_proxy(_), do: {:error, "invalid devbox token"}

  @doc """
  Whether a bearer token claims to be a devbox token.  Unverified: only for routing a request to `verify/2`.
  """
  @spec devbox_token?(binary) :: boolean
  def devbox_token?(token) when is_binary(token) do
    case Guardian.peek(Console.Guardian, token) do
      %{claims: %{"typ" => @typ}} -> true
      _ -> false
    end
  rescue
    _ -> false
  end
  def devbox_token?(_), do: false

  defp verify_instance(%DevboxInstance{workbench: wb} = inst) do
    with {:live, true} <- {:live, live?(inst)},
         {:budget, true} <- {:budget, budget_available?(wb)} do
      {:ok, inst}
    else
      {:live, _} -> {:error, "devbox instance has ended"}
      {:budget, _} -> {:error, "workbench budget is exhausted"}
    end
  end

  @doc """
  Whether the workbench has budget left for AI proxy traffic.
  """
  @spec budget_available?(Workbench.t | nil) :: boolean
  def budget_available?(%Workbench{budget: %Workbench.Budget{} = budget}), do: Workbench.Budget.available?(budget)
  def budget_available?(_), do: true

  @doc """
  Revokes every credential minted for an instance: its tokens stop verifying once `credentials_revoked_at` is set.
  Idempotent.
  """
  @spec revoke(DevboxInstance.t) :: {:ok, DevboxInstance.t} | Console.error
  def revoke(%DevboxInstance{credentials_revoked_at: %DateTime{}} = inst), do: {:ok, inst}
  def revoke(%DevboxInstance{} = inst) do
    inst
    |> DevboxInstance.changeset(%{credentials_revoked_at: DateTime.utc_now()})
    |> Repo.update()
  end

  @doc """
  Mints the credentials the gateway's credential provider asked for (`Ingest.GetInstanceCredentials`).  Selectors
  are maps with a `kind` (`:scm`, `:ai_proxy`, `:console`, `:oidc`, `:claude_oauth` or `:codex`) and, for scm, an
  optional `host`, for oidc an optional cloud `identity` name.
  """
  @spec instance_credentials(DevboxInstance.t, [map]) :: {:ok, [credential]} | Console.error
  def instance_credentials(%DevboxInstance{} = inst, selectors) do
    with true <- live?(inst) || {:error, "devbox instance has ended, its credentials are revoked"} do
      Enum.reduce_while(selectors, {:ok, []}, fn selector, {:ok, acc} ->
        case credentials(inst, selector) do
          {:ok, creds} -> {:cont, {:ok, acc ++ creds}}
          err -> {:halt, err}
        end
      end)
    end
  end

  defp credentials(inst, %{kind: :ai_proxy}) do
    with {:ok, token, exp} <- mint_ai_proxy_token(inst),
      do: {:ok, [credential(:ai_proxy, token, exp)]}
  end

  defp credentials(inst, %{kind: :console}) do
    with {:ok, token, exp} <- console_token(inst),
      do: {:ok, [credential(:console, token, exp)]}
  end

  defp credentials(inst, %{kind: :scm} = selector) do
    inst
    |> scm_connections(selector[:host])
    |> Enum.reduce_while({:ok, []}, fn conn, {:ok, acc} ->
      case backfill_token(conn) do
        {:ok, %ScmConnection{token: token} = conn} when is_binary(token) ->
          {:cont, {:ok, acc ++ [scm_credential(conn)]}}
        {:ok, _} -> {:cont, {:ok, acc}}
        err -> {:halt, err}
      end
    end)
  end

  defp credentials(inst, %{kind: :oidc} = selector) do
    %{devbox: devbox} = inst = Repo.preload(inst, [:devbox, :workbench, :user])
    case cloud_identities(devbox, selector[:identity]) do
      [] -> {:error, "devbox #{devbox.name} has no cloud identity #{selector[:identity] || ""}" |> String.trim()}
      ids ->
        Enum.reduce_while(ids, {:ok, []}, fn id, {:ok, acc} ->
          case oidc_credential(inst, id) do
            {:ok, cred} -> {:cont, {:ok, acc ++ [cred]}}
            err -> {:halt, err}
          end
        end)
    end
  end

  defp credentials(inst, %{kind: kind}) when kind in ~w(claude_oauth codex)a,
    do: AgentCredentials.deliver(inst, kind)

  defp credentials(_, %{kind: kind}), do: Error.unsupported("#{kind} credentials are not supported for devboxes yet")

  defp cloud_identities(%Devbox{cloud_identities: ids}, name) when name in [nil, ""], do: ids || []
  defp cloud_identities(%Devbox{cloud_identities: ids}, name), do: Enum.filter(ids || [], & &1.name == name)

  defp oidc_credential(%DevboxInstance{devbox: devbox} = inst, identity) do
    aud = DevboxScope.audience(identity)
    ttl = oidc_ttl(identity)
    with {:ok, token, claims} <- WorkloadIdentity.mint({DevboxScope.type(), devbox.id}, %{
                                   subject: DevboxScope.subject(devbox),
                                   audience: aud,
                                   ttl: ttl,
                                   claims: oidc_claims(inst)
                                 }) do
      exp = DateTime.from_unix!(claims["exp"])
      {:ok, %{
        kind: :oidc,
        identity: identity.name,
        token: token,
        expires_at: exp,
        refresh_after: DateTime.add(exp, -min(@refresh_ahead, div(ttl, 5)), :second),
        metadata: identity_metadata(identity, aud, WorkloadIdentity.issuer_url(DevboxScope.type(), devbox.id))
      }}
    end
  end

  defp oidc_ttl(%Devbox.CloudIdentity{duration_seconds: secs}) when is_integer(secs) and secs > 0,
    do: min(secs, DevboxScope.max_ttl())
  defp oidc_ttl(_), do: DevboxScope.default_ttl()

  defp oidc_claims(%DevboxInstance{} = inst) do
    tags = %{
      "devbox" => [inst.devbox.name],
      "instance" => [inst.id],
      "workbench" => [inst.workbench && inst.workbench.name],
      "user" => [inst.user && inst.user.email]
    }
    |> Enum.reject(fn {_, [v]} -> is_nil(v) end)
    |> Map.new()

    %{
      "instance" => inst.id,
      "workbench" => inst.workbench && inst.workbench.name,
      "user" => inst.user && inst.user.email,
      "repositories" => inst.repositories || [],
      "https://aws.amazon.com/tags" => %{"principal_tags" => tags, "transitive_tag_keys" => Map.keys(tags)}
    }
    |> Console.drop_nils()
  end

  defp identity_metadata(identity, aud, issuer) do
    identity
    |> Map.from_struct()
    |> Map.take(~w(provider role_arn duration_seconds workload_identity_provider service_account tenant_id client_id authority_host)a)
    |> Console.drop_nils()
    |> Map.new(fn {k, v} -> {to_string(k), (is_atom(v) && to_string(v)) || v} end)
    |> Map.merge(%{"audience" => aud, "issuer" => issuer})
  end

  defp credential(kind, token, expires_at) do
    %{
      kind: kind,
      token: token,
      host: nil,
      header_name: "Authorization",
      header_format: header_format(kind),
      expires_at: expires_at,
      refresh_after: DateTime.add(expires_at, -@refresh_ahead, :second)
    }
  end

  defp header_format(_), do: "Bearer %s"

  # egress writes Sprintf(header_format, token) on the SCM host and all its companions (api.github.com, ...), so one
  # value has to serve git smart-HTTP and the REST API: basic auth where the provider's git endpoint requires it,
  # with the user:token pair as the token
  defp scm_credential(%ScmConnection{token: token} = conn) do
    cred = %{credential(:scm, token, expiry()) | host: scm_host(conn)}
    case basic_user(conn) do
      user when is_binary(user) ->
        %{cred | token: Base.encode64("#{user}:#{token}"), header_format: "Basic %s"}
        |> Map.put(:metadata, %{"scheme" => "basic", "username" => user})
      nil -> Map.put(cred, :metadata, %{"scheme" => "bearer"})
    end
  end

  defp basic_user(%ScmConnection{type: :github}), do: "x-access-token"
  defp basic_user(%ScmConnection{type: :gitlab}), do: "oauth2"
  defp basic_user(%ScmConnection{type: :bitbucket, username: u}) when is_binary(u) and byte_size(u) > 0, do: u
  defp basic_user(%ScmConnection{type: :bitbucket}), do: "x-token-auth"
  defp basic_user(%ScmConnection{type: :bitbucket_datacenter, username: u}) when is_binary(u) and byte_size(u) > 0, do: u
  defp basic_user(%ScmConnection{type: :bitbucket_datacenter, bitbucket_datacenter: %{user_slug: u}}) when is_binary(u), do: u
  defp basic_user(%ScmConnection{type: :azure_devops, azure: %{username: u}}) when is_binary(u), do: u
  defp basic_user(%ScmConnection{type: :azure_devops}), do: ""
  defp basic_user(_), do: nil

  @doc """
  The scm connections usable from an instance: the box's own, or the default connection.
  """
  @spec scm_connections(DevboxInstance.t | Devbox.t, binary | nil) :: [ScmConnection.t]
  def scm_connections(%DevboxInstance{} = inst, host) do
    %{devbox: devbox} = Repo.preload(inst, [devbox: :scm_connections])
    scm_connections(devbox, host)
  end

  def scm_connections(%Devbox{} = devbox, host) do
    case Repo.preload(devbox, [:scm_connections]) do
      %Devbox{scm_connections: [_ | _] = conns} -> conns
      _ -> Enum.filter([Tool.scm_connection()], & &1)
    end
    |> Enum.filter(&(host in [nil, ""] || scm_host(&1) == normalize_host(host)))
  end

  defp normalize_host(host), do: host |> String.trim() |> String.downcase() |> String.trim_trailing(".")

  @doc """
  The scm connection for a repository, matched by host.
  """
  @spec scm_connection(DevboxInstance.t | Devbox.t, binary) :: ScmConnection.t | nil
  def scm_connection(resource, repository) do
    host = repository_host(repository)
    case scm_connections(resource, nil) do
      [conn] -> conn
      conns -> Enum.find(conns, &(scm_host(&1) == host))
    end
  end

  @doc """
  The host of a repository url, in either https or ssh form.
  """
  @spec repository_host(binary) :: binary | nil
  def repository_host(url) when is_binary(url) do
    normalize_url(url)
    |> String.split("/", parts: 2)
    |> List.first()
  end
  def repository_host(_), do: nil

  defp scm_host(%ScmConnection{base_url: url}) when is_binary(url) and byte_size(url) > 0 do
    case URI.parse(url) do
      %URI{host: host} when is_binary(host) -> normalize_host(host)
      _ -> nil
    end
  end
  defp scm_host(%ScmConnection{type: :github}), do: "github.com"
  defp scm_host(%ScmConnection{type: :gitlab}), do: "gitlab.com"
  defp scm_host(%ScmConnection{type: :bitbucket}), do: "bitbucket.org"
  defp scm_host(%ScmConnection{type: :azure_devops}), do: "dev.azure.com"
  defp scm_host(_), do: nil

  defp live?(%DevboxInstance{status: status, credentials_revoked_at: nil}), do: !DevboxInstance.terminal?(status)
  defp live?(_), do: false

  defp expiry(), do: DateTime.add(DateTime.utc_now(), @ttl, :second)
end
