defmodule Console.Services.OAuth do
  @moduledoc """
  Business logic for managing OIDC logins.  Uses the oidcc erlang/elixir library which seems to be the best supported at the moment,
  and also conditionally handles pkce negotiation by saving in cache, which is durable enough for short duration storage.

  If a client private key is configured, the client authenticates to the token endpoint with a signed
  `urn:ietf:params:oauth:client-assertion-type:jwt-bearer` assertion (private_key_jwt) instead of a client secret.
  We mint that assertion ourselves rather than use oidcc's built-in private_key_jwt support, since oidcc only sets
  a `kid` header and IdPs like ADFS/Entra require `x5t` too.  oidcc then sends it as an extension of the `none` auth method.

  Otherwise oidcc picks the token endpoint auth method from what the provider advertises, preferring `client_secret_jwt`
  over `client_secret_basic`/`client_secret_post`.  `auth_method` pins it instead, eg to `none` for public clients, which
  some IdPs (PingFederate 13.1+) require since they reject any client assertion from a client registered without auth.
  """
  use Console.Services.Base
  alias Console.AI.Provider.TokenExchange.Assertion

  @well_known_url "/.well-known/openid-configuration"
  @auth_methods ~w(none client_secret_basic client_secret_post client_secret_jwt)
  @assertion_type "urn:ietf:params:oauth:client-assertion-type:jwt-bearer"
  @name Console.OidcConfigProvider

  @cache_adapter Console.conf(:cache_adapter)

  def name(), do: @name

  @spec configuration() :: keyword
  def configuration() do
    conf = Console.conf(:oidc_providers) || []
    Keyword.get(conf, :plural, [])
  end

  @spec configuration(atom) :: any
  def configuration(name), do: Keyword.get(configuration(), name)

  @spec issuer() :: binary | nil
  def issuer() do
    case configuration(:discovery_document_uri) do
      v when is_binary(v) -> String.trim_trailing(v, @well_known_url)
      _ -> nil
    end
  end

  @spec scopes() :: [binary]
  def scopes() do
    case configuration(:scope) do
      scope when is_binary(scope) -> String.split(scope)
      l when is_list(l) -> l
      _ -> ~w(openid email)
    end
  end

  @doc """
  Whether the client authenticates to the token endpoint with a private key jwt assertion
  """
  @spec client_assertion?() :: boolean
  def client_assertion?() do
    case configuration(:client_private_key) do
      key when is_binary(key) and byte_size(key) > 0 -> true
      _ -> false
    end
  end

  @doc """
  The explicitly configured token endpoint auth method, if any.  Raises on unsupported values so a typo doesn't
  silently fall back to oidcc's default choice.
  """
  @spec auth_method() :: atom | nil
  def auth_method() do
    case configuration(:auth_method) do
      m when m in [nil, ""] -> nil
      m when m in @auth_methods -> String.to_atom(m)
      m -> raise ArgumentError, "unsupported OIDC_AUTH_METHOD #{inspect(m)}, must be one of #{Enum.join(@auth_methods, ", ")}"
    end
  end

  @doc """
  Provider configuration quirks for the oidcc worker.  When using client assertions, the advertised token endpoint
  auth methods are pinned to `none` so oidcc never falls back to secret-based auth, and our assertion is sent as a
  body extension instead.
  """
  @spec provider_quirks() :: map
  def provider_quirks() do
    quirks = %{allow_issuer_mismatch: true}
    case client_assertion?() do
      true -> Map.put(quirks, :document_overrides, %{"token_endpoint_auth_methods_supported" => ["none"]})
      false -> quirks
    end
  end

  @doc """
  Formats a valid oidc redirect uri, or raises if none can be generated
  """
  @spec redirect_uri(binary | nil) :: binary
  def redirect_uri(redirect) do
    opts = create_pkce_token(%{
      redirect_uri: redirect || configuration(:redirect_uri),
      state: state_token(),
      scopes: scopes()
    }, configuration(:pkce_enabled))

    opts
    |> add_auth_method()
    |> create_redirect_url()
    |> bang!()
    |> IO.iodata_to_binary()
  end

  defp create_redirect_url(opts) do
    with {:ok, ctx} <- Oidcc.ClientContext.from_configuration_worker(@name, configuration(:client_id), client_secret()),
      do: Oidcc.Authorization.create_redirect_url(without_optional_par(ctx), opts)
  end

  # oidcc uses a provider's PAR endpoint whenever one is advertised, even if `require_pushed_authorization_requests` is false
  defp without_optional_par(%Oidcc.ClientContext{provider_configuration: %{require_pushed_authorization_requests: true}} = ctx),
    do: ctx
  defp without_optional_par(%Oidcc.ClientContext{provider_configuration: conf} = ctx),
    do: %{ctx | provider_configuration: %{conf | pushed_authorization_request_endpoint: :undefined}}

  @doc """
  Retrieves a token using the default oidc configuration.
  """
  @spec retrieve_token(map) :: {:ok, Oidcc.Token.t()} | Console.error
  def retrieve_token(args) do
    {code, args} = Map.pop(args, :code)
    with {:ok, opts} <- token_args(args),
         {:ok, res} <- Oidcc.retrieve_token(code, @name, configuration(:client_id), client_secret(), opts) do
      {:ok, res}
    else
      err -> {:error, "oidc handshake error: #{inspect(err)}"}
    end
  end

  @doc """
  Retrieves ID token claims for login. When userinfo is enabled, those claims
  are merged over the ID token, and a userinfo error fails the exchange.
  """
  @spec retrieve_claims(map) :: {:ok, map} | Console.error
  def retrieve_claims(args) do
    with {:ok, token} <- retrieve_token(args),
         {:ok, claims} <- id_claims(token) do
      merge_userinfo(token, claims)
    end
  end

  defp id_claims(%Oidcc.Token{id: %Oidcc.Token.Id{claims: claims}}), do: {:ok, claims}
  defp id_claims(%Oidcc.Token{}), do: {:error, "oidc handshake error: id token missing"}

  defp merge_userinfo(token, claims), do: merge_userinfo(configuration(:userinfo), token, claims)

  defp merge_userinfo(true, token, claims) do
    case Oidcc.retrieve_userinfo(
      token,
      @name,
      configuration(:client_id),
      client_secret(),
      %{}
    ) do
      {:ok, userinfo} -> {:ok, Map.merge(claims, userinfo)}
      err -> {:error, "oidc userinfo error: #{inspect(err)}"}
    end
  end
  defp merge_userinfo(_, _token, claims), do: {:ok, claims}

  defp token_args(args) do
    args
    |> Map.put(:redirect_uri, args[:redirect] || configuration(:redirect_uri))
    |> Map.put(:scope, scopes())
    |> add_pkce_token()
    |> add_auth_method()
    |> add_client_assertion(client_assertion?())
  end

  defp add_auth_method(opts) do
    case auth_method() do
      nil -> opts
      method -> Map.put(opts, :preferred_auth_methods, [method])
    end
  end

  defp add_client_assertion(args, true) do
    with {:ok, assertion} <- Assertion.mint(
                               configuration(:client_id),
                               assertion_audience(),
                               configuration(:client_private_key),
                               configuration(:client_key_id)
                             ) do
      {:ok, Map.merge(args, %{
        preferred_auth_methods: [:none],
        body_extension: [
          {"client_assertion_type", @assertion_type},
          {"client_assertion", assertion}
        ]
      })}
    end
  end
  defp add_client_assertion(args, _), do: {:ok, args}

  defp assertion_audience() do
    case configuration(:client_assertion_audience) do
      aud when is_binary(aud) and byte_size(aud) > 0 -> aud
      _ -> Oidcc.ProviderConfiguration.Worker.get_provider_configuration(@name).token_endpoint
    end
  end

  defp client_secret() do
    case {client_assertion?(), auth_method()} do
      {false, method} when method != :none -> configuration(:client_secret)
      _ -> :unauthenticated
    end
  end

  defp state_token() do
    :crypto.strong_rand_bytes(32)
    |> Base.url_encode64()
  end

  defp create_pkce_token(%{state: state} = args, true) when is_binary(state) do
    pkce = Console.rand_alphanum(128)
    @cache_adapter.put({:pkce, state}, pkce, ttl: :timer.minutes(30))
    Map.put(args, :pkce_verifier, pkce)
  end
  defp create_pkce_token(args, _), do: args

  defp add_pkce_token(%{state: state} = args) when is_binary(state) do
    case {@cache_adapter.get({:pkce, state}), configuration(:pkce_enabled)} do
      {pkce, true} when is_binary(pkce) ->
        @cache_adapter.delete({:pkce, state})
        Map.put(args, :pkce_verifier, pkce)
      _ -> args
    end
  end
  defp add_pkce_token(args), do: args
end
