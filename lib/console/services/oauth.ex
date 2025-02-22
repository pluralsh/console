defmodule Console.Services.OAuth do
  @moduledoc """
  Business logic for managing OIDC logins.  Uses the oidcc erlang/elixir library which seems to be the best supported at the moment,
  and also conditionally handles pkce negotiation by saving in cache, which is durable enough for short duration storage.
  """
  use Console.Services.Base

  @well_known_url "/.well-known/openid-configuration"
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
  Formats a valid oidc redirect uri, or raises if none can be generated
  """
  @spec redirect_uri(binary | nil) :: binary
  def redirect_uri(redirect) do
    Oidcc.create_redirect_url(
      @name,
      configuration(:client_id),
      configuration(:client_secret),
      create_pkce_token(%{
        redirect_uri: redirect || configuration(:redirect_uri),
        state: state_token(),
        scopes: scopes()
      }, configuration(:pkce_enabled))
    )
    |> bang!()
    |> IO.iodata_to_binary()
  end

  @doc """
  Retrieves a token using the default oidc configuration.
  """
  @spec retrieve_token(map) :: {:ok, Oidcc.Token.t()} | Console.error
  def retrieve_token(args) do
    {code, args} = Map.pop(args, :code)
    case Oidcc.retrieve_token(
      code,
      @name,
      configuration(:client_id),
      configuration(:client_secret),
      token_args(args)
    ) do
      {:ok, res} -> {:ok, res}
      err -> {:error, "oidc handshake error: #{inspect(err)}"}
    end
  end

  defp token_args(args) do
    args
    |> Map.put(:redirect_uri, args[:redirect] || configuration(:redirect_uri))
    |> Map.put(:scope, scopes())
    |> add_pkce_token()
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
