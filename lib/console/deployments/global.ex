defmodule Console.Deployments.Global do
  use Console.Services.Base
  import Console.Deployments.Policies
  alias Console.PubSub
  alias Console.Deployments.Services
  alias Console.Services.Users
  alias Console.Schema.{GlobalService, Service, Cluster, User, Tag}
  require Logger

  @type global_resp :: {:ok, GlobalService.t} | Console.error

  def get!(id), do: Repo.get!(GlobalService, id)

  @doc """
  Creates a new global service and defers syncing clusters through the pubsub broadcaster
  """
  @spec create(map, binary, User.t) :: global_resp
  def create(attrs, service_id, %User{} = user) do
    %GlobalService{service_id: service_id}
    |> GlobalService.changeset(attrs)
    |> allow(user, :write)
    |> when_ok(:insert)
    |> notify(:create, user)
  end


  @doc """
  Deletes a global service and delinks any created services
  """
  @spec delete(binary, User.t) :: global_resp
  def delete(global_id, %User{} = user) do
    start_transaction()
    |> add_operation(:owned, fn _ ->
      Service.for_owner(global_id)
      |> Repo.update_all(set: [owner_id: nil])
      |> ok()
    end)
    |> add_operation(:global, fn _ ->
      get!(global_id)
      |> allow(user, :write)
      |> when_ok(:delete)
    end)
    |> execute(extract: :global)
    |> notify(:delete, user)
  end

  @doc """
  Determines if a global service is eligible for this cluster
  """
  @spec match?(GlobalService.t, Cluster.t) :: boolean
  def match?(%GlobalService{} = global, %Cluster{} = cluster) do
    Enum.all?([
      {:field, global.distro, cluster.distro},
      {:field, global.provider_id, cluster.provider_id},
      {:tags, global.tags, cluster.tags},
    ], fn
      {:field, nil, _} -> true
      {:field, v, v} -> true
      {:field, _, _} -> false
      {:tags, t1, t2} -> matches_tags?(t1, t2)
    end)
  end

  @doc """
  Clones the global service directly into the target cluster
  """
  @spec add_to_cluster(GlobalService.t, Cluster.t) :: Services.service_resp
  def add_to_cluster(%GlobalService{id: gid, service_id: sid}, %Cluster{id: cid}) do
    bot = %{Users.get_bot!("console") | roles: %{admin: true}}
    Services.clone_service(%{owner_id: gid}, sid, cid, bot)
  end

  @doc """
  Adds the given global service to all target clusters
  """
  @spec sync_clusters(GlobalService.t) :: :ok
  def sync_clusters(%GlobalService{id: gid} = global) do
    %{service: svc} = Console.Repo.preload(global, [:service])
    bot = %{Users.get_bot!("console") | roles: %{admin: true}}
    Cluster.ignore_ids([svc.cluster_id])
    |> Cluster.target(global)
    |> Repo.all()
    |> Enum.each(fn %{id: cluster_id} ->
      case Services.get_service_by_name(cluster_id, svc.name) do
        %Service{owner_id: ^gid} = dest -> sync_service(svc, dest, bot)
        %Service{} -> :ok # ignore if the service was created out of band
        nil -> Services.clone_service(%{owner_id: gid}, svc.id, cluster_id, bot)
      end
    end)
  end

  @doc """
  it can resync a service owned by a global service
  """
  @spec sync_service(Service.t, Service.t, User.t) :: Services.service_resp | :ok
  def sync_service(%Service{} = source, %Service{} = dest, %User{} = user) do
    Logger.info "attempting to resync service #{dest.id}"
    with {:ok, source_secrets} <- Services.configuration(source),
         {:ok, dest_secrets} <- Services.configuration(dest),
         {:diff, true} <- {:diff, diff?(source, dest, source_secrets, dest_secrets)} do
      Services.update_service(%{
        namespace: source.namespace,
        configuration: Enum.map(Map.merge(dest_secrets, source_secrets), fn {k, v} -> %{name: k, value: v} end),
        repository_id: source.repository_id,
        git: clean(source.git),
      }, dest.id, user)
    else
      err -> Logger.info "did not sync service due to: #{inspect(err)}"
    end
  end

  @doc """
  Determines if services are different enough to merit resyncing
  """
  @spec diff?(Service.t, Service.t) :: boolean | {:error, term}
  def diff?(%Service{} = source, %Service{} = dest) do
    with {:ok, source_secrets} <- Services.configuration(source),
         {:ok, dest_secrets} <- Services.configuration(dest),
      do: diff?(source, dest, source_secrets, dest_secrets)
  end

  defp diff?(%Service{git: git_source} = s, %Service{git: git_dest} = d, source, dest) do
    missing_source?(source, dest) || clean(git_source) != clean(git_dest) || s.repository_id != d.repository_id || s.namespace != d.namespace
  end

  defp matches_tags?([], _), do: true
  defp matches_tags?(tags, other_tags), do: Tag.as_map(tags) == Tag.as_map(other_tags)

  defp missing_source?(source, dest) do
    Enum.any?(source, fn {k, v} -> dest[k] != v end)
  end

  defp clean(git), do: Map.take(git, [:ref, :folder])

  def notify({:ok, %GlobalService{} = svc}, :create, user),
    do: handle_notify(PubSub.GlobalServiceCreated, svc, actor: user)
  def notify({:ok, %GlobalService{} = svc}, :delete, user),
    do: handle_notify(PubSub.GlobalServiceDeleted, svc, actor: user)
  def notify(pass, _, _), do: pass
end
