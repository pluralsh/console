defmodule Console.Deployments.OAuth do
  use Console.Services.Base
  alias Console.Plural.Accounts

  @type oauth_type :: :plural
  @type error :: {:error, term}
  @type provider :: %{id: binary, name: binary, description: binary, redirect_urls: [binary]}
  @type provider_resp :: {:ok, provider} | error

  @doc """
  Creates an upstream oidc provider in the configured auth service, at the moment, just supports Plural
  """
  @spec create(oauth_type, map) :: provider_resp
  def create(:plural, attrs) do
    rewire_attrs(attrs)
    |> Accounts.create_oidc_provider()
    |> rewire()
  end

  @doc """
  Updates an upstream oidc provider in the configured auth service, at the moment, just supports Plural
  """
  @spec update(oauth_type, binary, map) :: provider_resp
  def update(:plural, id, attrs) do
    Accounts.update_oidc_provider(id, rewire_attrs(attrs))
    |> rewire()
  end

  @doc """
  Deletes an upstream oidc provider in the configured auth service, at the moment, just supports Plural
  """
  @spec delete(oauth_type, binary) :: provider_resp
  def delete(:plural, id) do
    Accounts.delete_oidc_provider(id)
    |> rewire()
  end

  defp rewire({:ok, resp}) do
    Map.from_struct(resp)
    |> Console.move([:redirectUris], [:redirect_uris])
    |> ok()
  end

  defp rewire(pass), do: pass

  defp rewire_attrs(attrs), do: Console.move(attrs, [:redirect_uris], [:redirectUris])
end
