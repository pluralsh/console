defmodule Console.Deployments.OAuth do
  use Console.Services.Base
  alias Console.Plural.Accounts
  alias Console.Schema.User
  alias Console.Services.{OIDC, Users}

  @type oauth_type :: :plural | :console
  @type auth_method :: :post | :basic
  @type error :: {:error, term}
  @type provider :: %{
    id: binary,
    name: binary | nil,
    auth_method: auth_method | nil,
    description: binary | nil,
    redirect_urls: [binary]
  }
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
  def create(:console, attrs), do: OIDC.create_oidc_provider(attrs, bot())

  @doc """
  Updates an upstream oidc provider in the configured auth service, at the moment, just supports Plural
  """
  @spec update(oauth_type, binary, map) :: provider_resp
  def update(:plural, id, attrs) do
    Accounts.update_oidc_provider(id, rewire_attrs(attrs))
    |> rewire()
  end
  def update(:console, id, attrs), do: OIDC.update_oidc_provider(attrs, id, bot())

  @doc """
  Deletes an upstream oidc provider in the configured auth service, at the moment, just supports Plural
  """
  @spec delete(oauth_type, binary) :: provider_resp
  def delete(:plural, id) do
    Accounts.delete_oidc_provider(id)
    |> rewire()
  end
  def delete(:console, id), do: OIDC.delete_oidc_provider(id, bot())

  defp rewire({:ok, resp}) do
    Map.from_struct(resp)
    |> Console.move([:redirectUris], [:redirect_uris])
    |> Console.move([:clientId], [:client_id])
    |> Console.move([:clientSecret], [:client_secret])
    |> Console.move([:authMethod], [:auth_method])
    |> Map.update(:auth_method, :post, fn
      "POST" -> :post
      "BASIC" -> :basic
      _ -> nil
    end)
    |> ok()
  end

  defp rewire(pass), do: pass

  defp bot() do
    Users.get_bot!("console")
    |> tmp_admin()
  end

  defp tmp_admin(%User{} = user), do: %{user | roles: %{admin: true}, bootstrap: nil}

  defp rewire_attrs(attrs) do
    attrs
    |> Map.update(:auth_method, :POST, &String.upcase("#{&1}"))
    |> Console.move([:redirect_uris], [:redirectUris])
    |> Console.move([:auth_method], [:authMethod])
    |> Map.take(~w(authMethod redirectUris name description)a)
  end
end
