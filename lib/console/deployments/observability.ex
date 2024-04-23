defmodule Console.Deployments.Observability do
  use Console.Services.Base
  import Console.Deployments.Policies
  alias Console.Schema.{ObservabilityProvider, User}

  @type error :: Console.error
  @type provider_resp :: {:ok, ObservabilityProvider.t} | error

  @spec get_provider(binary) :: ObservabilityProvider.t | nil
  def get_provider(id), do: Repo.get(ObservabilityProvider, id)

  @spec get_provider(binary) :: ObservabilityProvider.t
  def get_provider!(id), do: Repo.get!(ObservabilityProvider, id)

  @spec get_provider_by_name(binary) :: ObservabilityProvider.t | nil
  def get_provider_by_name(name), do: Repo.get_by(ObservabilityProvider, name: name)

  @spec get_provider_by_name(binary) :: ObservabilityProvider.t
  def get_provider_by_name!(name), do: Repo.get_by!(ObservabilityProvider, name: name)

  @doc """
  Create or update a provider, must inclue name in attrs
  """
  @spec upsert_provider(map, User.t) :: provider_resp
  def upsert_provider(%{name: name} = attrs, %User{} = user) do
    case get_provider_by_name(name) do
      %ObservabilityProvider{} = prov -> prov
      nil -> %ObservabilityProvider{}
    end
    |> ObservabilityProvider.changeset(attrs)
    |> allow(user, :write)
    |> when_ok(&Repo.insert_or_update/1)
  end

  @doc """
  Delete a provider by id
  """
  @spec delete_provider(binary, User.t) :: provider_resp
  def delete_provider(id, %User{} = user) do
    get_provider!(id)
    |> allow(user, :write)
    |> when_ok(:delete)
  end
end
