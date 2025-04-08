defmodule Console.Services.OIDC do
  @moduledoc """
  Business logic for managing API-driven OIDC clients via Ory Hydra, not for managing login
  to the console itself.
  """
  use Console.Services.Base
  import Console.Policies.OIDC
  alias Console.Schema.{User, OIDCProvider}
  alias Console.Services.OIDC.Hydra
  require Logger

  @type error :: {:error, term}
  @type oauth_resp :: {:ok, %Hydra.Response{}} | error
  @type oidc_resp :: {:ok, OidcProvider.t} | error

  @oidc_scopes "profile code openid offline_access offline"
  @grant_types ~w(authorization_code refresh_token client_credentials)

  def get_provider(id), do: Repo.get(OIDCProvider, id)

  def get_provider!(id), do: Repo.get!(OIDCProvider, id)

  def get_provider_by_client!(client_id) do
    Repo.get_by!(OIDCProvider, client_id: client_id)
    |> Repo.preload([:bindings])
  end

  @doc """
  Creates a new oidc provider for a given installation, enabling a log-in with plural experience
  """
  @spec create_oidc_provider(map, User.t) :: oidc_resp
  def create_oidc_provider(attrs, %User{} = user) do
    start_transaction()
    |> add_operation(:client, fn _ ->
      Map.take(attrs, [:redirect_uris])
      |> Map.put(:scope, @oidc_scopes)
      |> Map.put(:grant_types, @grant_types)
      |> Map.put(:token_endpoint_auth_method, oidc_auth_method(attrs.auth_method))
      |> Hydra.create_client()
    end)
    |> add_operation(:oidc_provider, fn
      %{client: %{client_id: cid, client_secret: secret}} ->
        attrs = Map.merge(attrs, %{
          client_id: cid,
          client_secret: secret
        })
        %OIDCProvider{}
        |> OIDCProvider.changeset(attrs)
        |> allow(user, :create)
        |> when_ok(:insert)
    end)
    |> execute(extract: :oidc_provider)
  end

  defp oidc_auth_method(:basic), do: "client_secret_basic"
  defp oidc_auth_method(:post), do: "client_secret_post"

  @doc """
  Updates the spec of an installation's oidc provider
  """
  @spec update_oidc_provider(map, binary, User.t) :: oidc_resp
  def update_oidc_provider(attrs, id, %User{} = user) do
    start_transaction()
    |> add_operation(:oidc, fn _ ->
      get_provider!(id)
      |> Repo.preload([:bindings])
      |> OIDCProvider.changeset(attrs)
      |> allow(user, :edit)
      |> when_ok(:update)
    end)
    |> add_operation(:client, fn
      %{oidc: %{client_id: id, auth_method: auth_method}} ->
        attrs = Map.take(attrs, [:redirect_uris])
                |> Map.put(:scope, @oidc_scopes)
                |> Map.put(:token_endpoint_auth_method, oidc_auth_method(auth_method))
        Hydra.update_client(id, attrs)
    end)
    |> execute(extract: :oidc)
  end

  @doc """
  Deletes an oidc provider and its hydra counterpart
  """
  @spec delete_oidc_provider(binary, User.t) :: oidc_resp
  def delete_oidc_provider(id, %User{} = user) do
    start_transaction()
    |> add_operation(:oidc, fn _ ->
      get_provider!(id)
      |> allow(user, :edit)
      |> when_ok(:delete)
    end)
    |> add_operation(:client, fn %{oidc: %{client_id: id}} ->
      with :ok <- Hydra.delete_client(id),
        do: {:ok, nil}
    end)
    |> execute(extract: :oidc)
  end

  @doc """
  Gets the data related to a specific login
  """
  @spec get_login(binary) :: {:ok, OIDCProvider.t} | error
  def get_login(challenge) do
    with {:ok, %{client: client} = login} <- Hydra.get_login(challenge),
         provider <- get_provider_by_client!(client.client_id) do
      {:ok, %{provider | login: login}}
    end
  end

  @doc """
  Get the data related to a consent screen
  """
  @spec get_consent(binary) :: {:ok, OIDCProvider.t} | error
  def get_consent(challenge) do
    with {:ok, %{client: client} = consent} <- Hydra.get_consent(challenge),
         provider <- get_provider_by_client!(client.client_id) do
      {:ok, %{provider | consent: consent}}
    end
  end

  @doc """
  Determines if a user is eligible to login, and either accepts or rejects the login
  request appropriately.
  """
  @spec handle_login(binary, User.t) :: oauth_resp
  def handle_login(challenge, %User{} = user) do
    user = Console.Services.Rbac.preload(user)
           |> Console.Repo.preload([:groups])
    with {:ok, provider} <- get_login(challenge),
         true <- eligible?(provider, user) do
      Hydra.accept_login(challenge, user)
    else
      false -> Hydra.reject_login(challenge)
      error -> error
    end
  end

  @doc """
  Consents to the scopes granted in the login exchanges and hydrates an id token
  """
  @spec consent(binary, [binary], User.t) :: oauth_resp
  def consent(challenge, scopes \\ ["profile", "offline_access", "offline"], %User{} = user) do
    user = Console.Repo.preload(user, [:groups])
    with {:ok, _} <- get_consent(challenge),
      do: Hydra.accept_consent(user, challenge, scopes)
  end

  @doc """
  Determines if a user can use this provider to log in, based on its configured policy
  """
  @spec eligible?(OIDCProvider.t, User.t) :: boolean
  def eligible?(%OIDCProvider{bindings: bindings}, %User{} = user) do
    group_ids = Enum.filter(bindings, & &1.group_id)
                |> Enum.map(& &1.group_id)
                |> MapSet.new()
    user_groups = Enum.map(user.groups, & &1.id) |> MapSet.new()

    with false <- Enum.any?(bindings, & &1.user_id == user.id),
      do: !MapSet.disjoint?(user_groups, group_ids)
  end
end
