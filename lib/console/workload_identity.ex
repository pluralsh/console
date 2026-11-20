defmodule Console.WorkloadIdentity do
  @moduledoc """
  Console as an OIDC identity provider that customers' cloud accounts federate with directly (plan section 4.9).

  Issuers are keyed by `(scope_type, scope_id)` and served at `https://<console>/oidc/<scope_type>/<scope_id>`
  (`/.well-known/openid-configuration` and `/jwks`).  Each has its own RS256 keys, encrypted at rest.  Every scope
  type is registered in `scopes/0` with a `Console.WorkloadIdentity.Scope` that decides which subjects, audiences
  and claims it may mint and for how long.  Tokens are stateless JWTs; only the signing keys are stored.

  Rotation is scheduled (`rotate_all/0`): a new key is published as `pending` for `@publish_ahead` before it signs
  anything, and the old key stays published until the scope's maximum token lifetime has passed.  `rotate_now/1` is
  the emergency path: it unpublishes every old key at once, which invalidates every outstanding token.
  """
  use Console.Services.Base
  require Logger
  alias Console.WorkloadIdentity.Scope
  alias Console.Schema.{WorkloadIdentityIssuer, WorkloadIdentityKey}

  @rotate_after 30 * 24 * 60 * 60
  @publish_ahead 24 * 60 * 60
  @skew 5 * 60

  @type scope :: {binary, binary}
  @type error :: Console.error
  @type issuer_resp :: {:ok, WorkloadIdentityIssuer.t} | error

  @scopes %{"devboxes" => Console.WorkloadIdentity.Scopes.Devboxes}

  @doc "The registered scope types and their `Console.WorkloadIdentity.Scope` implementations"
  @spec scopes() :: %{binary => module}
  def scopes(), do: @scopes

  @spec scope(binary) :: {:ok, module} | error
  def scope(type) do
    case Map.fetch(@scopes, type) do
      {:ok, mod} -> {:ok, mod}
      :error -> {:error, "unknown workload identity scope #{type}"}
    end
  end

  @spec issuer_url(binary, binary) :: binary
  def issuer_url(scope_type, scope_id), do: Console.url("/oidc/#{scope_type}/#{scope_id}")

  @spec issuer_url(WorkloadIdentityIssuer.t) :: binary
  def issuer_url(%WorkloadIdentityIssuer{scope_type: t, scope_id: id}), do: issuer_url(t, id)

  @spec get_issuer(binary, binary) :: WorkloadIdentityIssuer.t | nil
  def get_issuer(scope_type, scope_id) do
    case Ecto.UUID.cast(scope_id) do
      {:ok, id} -> Repo.one(WorkloadIdentityIssuer.for_scope(scope_type, id))
      :error -> nil
    end
  end

  @doc """
  The enabled issuer for a scope, or nil.  What the public discovery and JWKS endpoints serve.
  """
  @spec get_enabled_issuer(binary, binary) :: WorkloadIdentityIssuer.t | nil
  def get_enabled_issuer(scope_type, scope_id) do
    case get_issuer(scope_type, scope_id) do
      %WorkloadIdentityIssuer{enabled: true} = issuer -> issuer
      _ -> nil
    end
  end

  @doc """
  Creates (or re-enables) the issuer for a scope, with an active signing key.  Idempotent.
  """
  @spec ensure_issuer(binary, binary) :: issuer_resp
  def ensure_issuer(scope_type, scope_id) do
    start_transaction()
    |> add_operation(:scope, fn _ -> scope(scope_type) end)
    |> add_operation(:issuer, fn _ ->
      (get_issuer(scope_type, scope_id) || %WorkloadIdentityIssuer{scope_type: scope_type, scope_id: scope_id})
      |> WorkloadIdentityIssuer.changeset(%{enabled: true, disabled_at: nil})
      |> Repo.insert_or_update()
    end)
    |> add_operation(:key, fn %{issuer: issuer} -> ensure_active_key(issuer) end)
    |> execute(extract: :issuer)
  end

  defp ensure_active_key(%WorkloadIdentityIssuer{id: id} = issuer) do
    case active_key(id) do
      %WorkloadIdentityKey{} = key -> {:ok, key}
      nil -> create_key(issuer, :active)
    end
  end

  @doc """
  Disables a scope's issuer: discovery and JWKS stop resolving and nothing more is minted, so every outstanding token
  stops verifying.  A no-op if there's no issuer.
  """
  @spec disable_issuer(binary, binary) :: {:ok, WorkloadIdentityIssuer.t | nil} | error
  def disable_issuer(scope_type, scope_id) do
    case get_issuer(scope_type, scope_id) do
      %WorkloadIdentityIssuer{} = issuer ->
        issuer
        |> WorkloadIdentityIssuer.changeset(%{enabled: false, disabled_at: DateTime.utc_now()})
        |> Repo.update()
      nil -> {:ok, nil}
    end
  end

  @doc """
  The OpenID discovery document for an issuer.
  """
  @spec discovery(WorkloadIdentityIssuer.t) :: map
  def discovery(%WorkloadIdentityIssuer{} = issuer) do
    url = issuer_url(issuer)
    %{
      "issuer" => url,
      "jwks_uri" => "#{url}/jwks",
      "response_types_supported" => ["id_token"],
      "subject_types_supported" => ["public"],
      "id_token_signing_alg_values_supported" => ["RS256"],
      "claims_supported" => ~w(iss sub aud exp iat nbf jti) ++ claims_supported(issuer)
    }
  end

  defp claims_supported(%WorkloadIdentityIssuer{scope_type: type}) do
    case scope(type) do
      {:ok, mod} -> mod.claims()
      _ -> []
    end
  end

  @doc """
  The JWKS for an issuer: pending, active and still-live retired keys.  Empty for a disabled issuer.
  """
  @spec jwks(WorkloadIdentityIssuer.t) :: map
  def jwks(%WorkloadIdentityIssuer{enabled: false}), do: %{"keys" => []}
  def jwks(%WorkloadIdentityIssuer{id: id}) do
    keys =
      WorkloadIdentityKey.for_issuer(id)
      |> WorkloadIdentityKey.published()
      |> WorkloadIdentityKey.ordered()
      |> Repo.all()
      |> Enum.map(& &1.public_jwk)
    %{"keys" => keys}
  end

  @doc """
  Mints a token for a scope.  `attrs` takes `subject`, `audience`, `claims` (custom claims) and `ttl` (seconds).  The
  scope's registry entry validates everything first.

  Returns the compact JWT and its claims.
  """
  @spec mint(scope, map) :: {:ok, binary, map} | error
  def mint({scope_type, scope_id}, %{subject: sub, audience: aud} = attrs) do
    claims = attrs[:claims] || %{}
    with {:ok, mod} <- scope(scope_type),
         %WorkloadIdentityIssuer{enabled: true} = issuer <- get_issuer(scope_type, scope_id) || {:error, "no workload identity issuer for #{scope_type}/#{scope_id}"},
         {:ok, ttl} <- Scope.validate(mod, scope_id, sub, aud, claims, attrs[:ttl]),
         %WorkloadIdentityKey{} = key <- active_key(issuer.id) || {:error, "workload identity issuer has no active key"} do
      now = System.system_time(:second)
      jti = Ecto.UUID.generate()
      full = Map.merge(claims, %{
        "iss" => issuer_url(issuer),
        "sub" => sub,
        "aud" => aud,
        "iat" => now,
        "nbf" => now - 30,
        "exp" => now + ttl,
        "jti" => jti
      })

      {_, token} =
        WorkloadIdentityKey.jwk(key)
        |> JOSE.JWT.sign(%{"alg" => "RS256", "kid" => key.kid, "typ" => "JWT"}, full)
        |> JOSE.JWS.compact()

      {:ok, token, full}
    else
      %WorkloadIdentityIssuer{enabled: false} -> {:error, "workload identity issuer #{scope_type}/#{scope_id} is disabled"}
      err -> err
    end
  end

  @doc """
  One scheduled rotation step for an issuer:

    * with no active key, creates one;
    * with a pending key published for at least `@publish_ahead`, promotes it and retires the active key until the
      scope's max ttl has passed;
    * otherwise, once the active key is older than `@rotate_after` minus `@publish_ahead`, publishes a pending key;
    * deletes retired keys no token can still need.
  """
  @spec rotate(WorkloadIdentityIssuer.t) :: issuer_resp
  def rotate(%WorkloadIdentityIssuer{id: id} = issuer) do
    now = DateTime.utc_now()
    start_transaction()
    |> add_operation(:keys, fn _ ->
      WorkloadIdentityKey.for_issuer(id)
      |> WorkloadIdentityKey.for_states([:pending, :active])
      |> Repo.all()
      |> ok()
    end)
    |> add_operation(:step, fn %{keys: keys} ->
      active = Enum.find(keys, & &1.state == :active)
      pending = Enum.find(keys, & &1.state == :pending)
      rotation_step(issuer, active, pending, now)
    end)
    |> add_operation(:prune, fn _ ->
      WorkloadIdentityKey.for_issuer(id)
      |> WorkloadIdentityKey.expired()
      |> Repo.delete_all()
      |> ok()
    end)
    |> execute()
    |> when_ok(fn _ -> issuer end)
  end

  defp rotation_step(issuer, nil, _, _), do: create_key(issuer, :active)
  defp rotation_step(issuer, active, %WorkloadIdentityKey{} = pending, now) do
    case older_than?(pending.inserted_at, @publish_ahead, now) do
      true -> promote(issuer, active, pending, now)
      false -> {:ok, :waiting}
    end
  end
  defp rotation_step(issuer, active, nil, now) do
    case older_than?(active.activated_at || active.inserted_at, @rotate_after - @publish_ahead, now) do
      true -> create_key(issuer, :pending)
      false -> {:ok, :current}
    end
  end

  defp promote(issuer, active, pending, now) do
    with {:ok, _} <- retire(issuer, active, now),
      do: pending |> WorkloadIdentityKey.changeset(%{state: :active, activated_at: now}) |> Repo.update()
  end

  defp retire(%WorkloadIdentityIssuer{scope_type: type}, key, now) do
    {:ok, mod} = scope(type)
    key
    |> WorkloadIdentityKey.changeset(%{state: :retired, retired_at: now, expires_at: DateTime.add(now, mod.max_ttl() + @skew, :second)})
    |> Repo.update()
  end

  @doc """
  Emergency rotation: a new active key, and every other key revoked (unpublished) immediately, so every token
  minted before now stops verifying.
  """
  @spec rotate_now(WorkloadIdentityIssuer.t) :: issuer_resp
  def rotate_now(%WorkloadIdentityIssuer{id: id} = issuer) do
    now = DateTime.utc_now()
    start_transaction()
    |> add_operation(:revoke, fn _ ->
      WorkloadIdentityKey.for_issuer(id)
      |> WorkloadIdentityKey.for_states([:pending, :active, :retired])
      |> Repo.update_all(set: [state: :revoked, retired_at: now, expires_at: now])
      |> ok()
    end)
    |> add_operation(:key, fn _ -> create_key(issuer, :active) end)
    |> execute()
    |> when_ok(fn _ -> issuer end)
  end

  @doc """
  Runs a scheduled rotation step for every enabled issuer.
  """
  @spec rotate_all() :: :ok
  def rotate_all() do
    WorkloadIdentityIssuer.enabled()
    |> Repo.stream(method: :keyset)
    |> Stream.each(fn issuer ->
      case rotate(issuer) do
        {:ok, _} -> :ok
        err -> Logger.error("failed to rotate workload identity keys for #{issuer.scope_type}/#{issuer.scope_id}: #{inspect(err)}")
      end
    end)
    |> Stream.run()
  end

  defp create_key(%WorkloadIdentityIssuer{id: id}, state) do
    now = DateTime.utc_now()
    %WorkloadIdentityKey{issuer_id: id}
    |> WorkloadIdentityKey.changeset(Map.merge(WorkloadIdentityKey.generate(), %{
      state: state,
      activated_at: state == :active && now || nil
    }))
    |> Repo.insert()
  end

  defp active_key(issuer_id) do
    WorkloadIdentityKey.for_issuer(issuer_id)
    |> WorkloadIdentityKey.for_states([:active])
    |> WorkloadIdentityKey.ordered(desc: :inserted_at)
    |> WorkloadIdentityKey.limit(1)
    |> Repo.one()
  end

  defp older_than?(%DateTime{} = at, secs, now), do: DateTime.diff(now, at, :second) >= secs
  defp older_than?(_, _, _), do: true
end
