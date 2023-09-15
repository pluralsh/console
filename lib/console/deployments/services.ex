defmodule Console.Deployments.Services do
  use Console.Services.Base
  alias Console.Schema.{Service, Revision, User}
  alias Console.Deployments.Secrets.Store

  @type service_resp :: {:ok, Service.t} | Console.error
  @type revision_resp :: {:ok, Revision.t} | Console.error

  def get_service!(id), do: Console.Repo.get!(Service, id)

  @doc """
  Creates a new service in a cluster, alongside an initial revision for the service
  """
  @spec create_service(map, binary, User.t) :: service_resp
  def create_service(attrs, cluster_id, %User{}) do
    start_transaction()
    |> add_operation(:base, fn _ ->
      %Service{cluster_id: cluster_id}
      |> Service.changeset(add_version(attrs, "0.0.1"))
      |> Console.Repo.insert()
    end)
    |> add_operation(:revision, fn %{base: base} -> create_revision(add_version(attrs, "0.0.1"), base) end)
    |> add_revision()
    |> execute(extract: :service)
  end

  @doc """
  Updates a service and creates a new revision
  """
  @spec update_service(map, binary, User.t) :: service_resp
  def update_service(attrs, service_id, %User{}) do
    start_transaction()
    |> add_operation(:base, fn _ ->
      get_service!(service_id)
      |> Service.changeset(attrs)
      |> Console.Repo.update()
    end)
    |> add_operation(:revision, fn %{base: base} ->
      add_version(attrs, base.version)
      |> Map.put_new(:git, Map.take(base.git, ~w(ref folder)a))
      |> create_revision(base)
    end)
    |> add_revision()
    |> execute(extract: :service)
  end

  defp add_version(attrs, vsn), do: Map.put_new(attrs, :version, vsn)

  @doc """
  Updates the list of service components, separate operation to avoid creating a no-op revision
  """
  @spec update_components(map, binary | Service.t) :: service_resp
  def update_components(attrs, %Service{} = service) do
    service
    |> Console.Repo.preload([:components])
    |> Service.changeset(attrs)
    |> Console.Repo.update()
  end
  def update_components(attrs, service_id) when is_binary(service_id),
    do: update_components(attrs, get_service!(service_id))

  @doc """
  Schedules a service to be cleaned up and ultimately deleted
  """
  @spec delete_service(binary, User.t) :: service_resp
  def delete_service(service_id, %User{}) do
    get_service!(service_id)
    |> Ecto.Changeset.change(%{deleted_at: Timex.now()})
    |> Console.Repo.update()
  end

  @doc """
  Fetches a service's configuration from the configured store
  """
  @spec configuration(Service.t) :: Store.secrets_resp
  def configuration(%Service{revision_id: revision_id}), do: secret_store().fetch(revision_id)

  @doc """
  fetches all revisions of a service
  """
  @spec revisions(Service.t) :: [Revision.t]
  def revisions(%Service{id: id}) do
    Revision.for_service(id)
    |> Revision.ordered()
    |> Console.Repo.all()
  end

  defp create_revision(attrs, %Service{id: id}) do
    start_transaction()
    |> add_operation(:revision, fn _ ->
      %Revision{service_id: id}
      |> Revision.changeset(attrs)
      |> Console.Repo.insert()
    end)
    |> add_operation(:secrets, fn %{revision: %{id: id}} ->
      secrets = Enum.into(attrs[:secrets] || [], %{}, & {&1.name, &1.value})
      secret_store().store(id, secrets)
    end)
    |> execute(extract: :revision)
  end

  defp add_revision(xact) do
    add_operation(xact, :service, fn %{revision: %{id: id}, base: service} ->
      Ecto.Changeset.change(service, %{revision_id: id})
      |> Console.Repo.update()
    end)
  end

  defp secret_store(), do: Console.conf(:secret_store)
end
