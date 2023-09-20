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

  def match?(%GlobalService{provider_id: gpid, tags: gtags}, %Cluster{provider_id: pid, tags: tags}) do
    case {gpid, pid, gtags, tags} do
      {nil, _, gtags, tags} -> matches_tags?(gtags, tags)
      {pid, pid, gtags, tags} -> matches_tags?(gtags, tags)
      _ -> false
    end
  end

  def add_to_cluster(%GlobalService{id: gid, service_id: sid}, %Cluster{id: cid}) do
    bot = %{Users.get_bot!("console") | roles: %{admin: true}}
    Services.clone_service(%{owner_id: gid}, sid, cid, bot)
  end

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

  def sync_service(%Service{} = source, %Service{} = dest, %User{} = user) do
    Logger.info "attempting to resync service #{dest.id}"
    with {:ok, source_secrets} <- Services.configuration(source),
         {:ok, dest_secrets} <- Services.configuration(dest),
         {:diff, true} <- {:diff, diff?(source, dest, source_secrets, dest_secrets)} do
      Services.update_service(%{
        namespace: source.namespace,
        configuration: Enum.map(source_secrets, fn {k, v} -> %{name: k, value: v} end),
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
    source != dest || clean(git_source) != clean(git_dest) || s.repository_id != d.repository_id || s.namespace != d.namespace
  end

  defp matches_tags?([], _), do: true
  defp matches_tags?(tags, other_tags), do: Tag.as_map(tags) == Tag.as_map(other_tags)

  defp clean(git), do: Map.take(git, [:ref, :folder])

  def notify({:ok, %GlobalService{} = svc}, :create, user),
    do: handle_notify(PubSub.GlobalServiceCreated, svc, actor: user)
  def notify({:ok, %GlobalService{} = svc}, :delete, user),
    do: handle_notify(PubSub.GlobalServiceDeleted, svc, actor: user)
  def notify(pass, _, _), do: pass
end
