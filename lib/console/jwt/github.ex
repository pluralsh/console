defmodule Console.Jwt.Github do
  use Joken.Config
  use Nebulex.Caching

  @type error :: Console.error

  @cache_adapter Console.conf(:cache_adapter)
  @ttl :timer.minutes(30)

  @doc """
  Mint a Github app jwt, mostly useable for fetching hour-long temporary access tokens via `app_token/4`
  """
  @spec mint(binary, binary) :: {:ok, binary} | error
  def mint(app_id, pem) do
    with {:ok, claims} <- generate_claims(%{"iss" => app_id}),
         {:ok, token, _} <- encode_and_sign(claims, signer(pem)),
      do: {:ok, token}
  end

  @doc """
  Generate a working Tentacat client w/ the given app installation information.  Specify `url` if
  it's self-hosted gh enterprise
  """
  @spec gh_client(binary | nil, binary, binary, binary, Keyword.t) :: {:ok, Tentacat.Client.t} | error
  def gh_client(url, app_id, inst_id, pem, opts \\ []) do
    with {:ok, token} <- app_token(url, app_id, inst_id, pem, opts),
      do: {:ok, client(:access_token, token, url)}
  end

  @doc """
  Generate a hour-long PAT for a given app installation setup. Caches for 30m to be well-within the token
  expiration window.
  """
  @spec app_token(binary | nil, binary, binary, binary, Keyword.t) :: {:ok, binary} | error
  def app_token(url, app_id, inst_id, pem, opts) do
    with {:ok, token, _} <- app_token_with_expiry(url, app_id, inst_id, pem, opts),
      do: {:ok, token}
  end

  @doc """
  `app_token/5` along with the token's expiry as github reports it.  A cached token can be up to 30m into its hour,
  so anything holding onto it past the current call has to honor this expiry rather than assume a fresh hour.
  """
  @spec app_token_with_expiry(binary | nil, binary, binary, binary, Keyword.t) :: {:ok, binary, DateTime.t} | error
  @decorate cacheable(cache: @cache_adapter, key: {:gh_app_token, url, app_id, inst_id, pem, opts}, opts: [ttl: @ttl])
  def app_token_with_expiry(url, app_id, inst_id, pem, opts) do
    with {:ok, jwt} <- mint(app_id, pem) do
      client(:jwt, jwt, url)
      |> add_opts(opts)
      |> Tentacat.App.Installations.token(inst_id)
      |> case do
        {_, %{"token" => token} = body, _} -> {:ok, token, expires_at(body)}
        _ -> {:error, "could not fetch installation token for application #{app_id}, your github app is likely misconfigured"}
      end
    end
  end

  # without github's expiry, assume the worst case a cached token can be in: minted a full cache ttl ago
  defp expires_at(%{"expires_at" => ts}) when is_binary(ts) do
    case DateTime.from_iso8601(ts) do
      {:ok, dt, _} -> dt
      _ -> expires_at(nil)
    end
  end
  defp expires_at(_), do: DateTime.add(DateTime.utc_now(), :timer.hours(1) - @ttl, :millisecond)

  defp client(key, jwt, url) when is_binary(url), do: Tentacat.Client.new(%{key => jwt}, url)
  defp client(key, jwt, _), do: Tentacat.Client.new(%{key => jwt})

  defp add_opts(%Tentacat.Client{} = client, [_ | _] = opts), do: %Tentacat.Client{client | request_options: opts}
  defp add_opts(client, _), do: client

  def signer(pem) do
    Joken.Signer.create("RS256", %{"pem" => pem})
  end

  def token_config(), do: default_claims(default_exp: 60 * 10)
end
