defmodule Console.OIDC.ProviderConfiguration do
  @moduledoc """
  Fetches and caches an OpenID Connect provider's configuration + JWKS for an issuer.

  `oidcc` normally recommends running a supervised `Oidcc.ProviderConfiguration.Worker` per provider (an in-memory
  GenServer that background-refreshes).  We instead cache through Nebulex so the result is shared across the
  cluster and we don't need a worker per issuer in the supervision tree.  The cache ttl is derived from the
  `Cache-Control` max-age the provider advertises on its metadata/JWKS responses (`oidcc` returns this as a
  relative millisecond expiry, falling back to its own 15m default), so entries refresh about when the signing
  keys would otherwise go stale.  We take the sooner of the config/jwks expiries (jwks rotation is what matters
  for signature validation) and clamp it to a sane window.

  Callers pass their own `quirks` opts map (`%{quirks: %{...}}`) for atypical providers - e.g. document overrides
  or `allow_issuer_mismatch` - since those are provider-specific.
  """
  require Logger

  @cache_adapter Console.conf(:cache_adapter)
  @min_ttl :timer.minutes(5)
  @max_ttl :timer.hours(24)

  @type provider :: {Oidcc.ProviderConfiguration.t(), :jose_jwk.key()}

  @doc """
  Loads (and caches) the provider configuration + jwks for `issuer`.  `quirks` is forwarded to
  `Oidcc.ProviderConfiguration.load_configuration/2`.
  """
  @spec fetch(binary, map) :: {:ok, provider} | {:error, term}
  def fetch(issuer, quirks \\ %{}) when is_binary(issuer) do
    case @cache_adapter.get(key(issuer)) do
      {_conf, _jwks} = hit -> {:ok, hit}
      _ -> refresh(issuer, quirks)
    end
  end

  defp refresh(issuer, quirks) do
    with {:ok, {conf, conf_exp}} <- Oidcc.ProviderConfiguration.load_configuration(issuer, quirks),
         {:ok, {jwks, jwks_exp}} <- Oidcc.ProviderConfiguration.load_jwks(conf.jwks_uri) do
      @cache_adapter.put(key(issuer), {conf, jwks}, ttl: ttl(conf_exp, jwks_exp))
      {:ok, {conf, jwks}}
    else
      err ->
        Logger.warning("failed to load oidc provider configuration for #{issuer}: #{inspect(err)}")
        normalize(err)
    end
  end

  defp normalize({:error, _} = err), do: err
  defp normalize(err), do: {:error, err}

  defp key(issuer), do: {:oidc_provider_config, issuer}

  defp ttl(conf_exp, jwks_exp) do
    min(conf_exp, jwks_exp)
    |> max(@min_ttl)
    |> min(@max_ttl)
  end
end
