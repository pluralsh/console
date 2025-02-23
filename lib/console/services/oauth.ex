defmodule Console.Services.OAuth do
  use Console.Services.Base

  @well_known_url "/.well-known/openid-configuration"
  @name Console.OidcConfigProvider

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
      %{
        redirect_uri: redirect || configuration(:redirect_uri),
        state: state_token(),
        scopes: scopes()
      }
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
    Oidcc.retrieve_token(
      code,
      @name,
      configuration(:client_id),
      configuration(:client_secret),
      token_args(args)
    )
  end

  defp token_args(args) do
    args
    |> Map.put(:redirect_uri, args[:redirect] || configuration(:redirect_uri))
    |> Map.put(:scope, :oidcc_scope.scopes_to_bin(scopes()))
  end

  defp state_token() do
    :crypto.strong_rand_bytes(32)
    |> Base.url_encode64()
  end
end
