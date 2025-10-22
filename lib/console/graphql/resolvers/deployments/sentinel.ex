defmodule Console.GraphQl.Resolvers.Deployments.Sentinel do
  use Console.GraphQl.Resolvers.Deployments.Base
  alias Console.Deployments.Sentinels
  alias Console.Schema.{Sentinel, SentinelRun, SentinelRunJob}

  def sentinel(%{id: id}, ctx) when is_binary(id) do
    Sentinels.get_sentinel!(id)
    |> allow(actor(ctx), :read)
  end
  def sentinel(%{name: name}, ctx) when is_binary(name) do
    Sentinels.get_sentinel_by_name!(name)
    |> allow(actor(ctx), :read)
  end
  def sentinel(_, _), do: {:error, "Must specify either id or name"}

  def sentinels(args, %{context: %{current_user: user}}) do
    Sentinel.ordered()
    |> Sentinel.for_user(user)
    |> maybe_search(Sentinel, args)
    |> sentinel_filters(args)
    |> paginate(args)
  end

  def sentinel_statistics(args, %{context: %{current_user: user}}) do
    Sentinel.for_user(user)
    |> sentinel_filters(args)
    |> maybe_search(Sentinel, args)
    |> Sentinel.statuses()
    |> Console.Repo.all()
    |> Enum.filter(& !is_nil(&1[:status]))
    |> ok()
  end

  def sentinel_runs(%{id: id}, args, _) do
    SentinelRun.for_sentinel(id)
    |> SentinelRun.ordered()
    |> paginate(args)
  end

  def sentinel_run(%{id: id}, ctx) do
    Sentinels.get_sentinel_run!(id)
    |> allow(actor(ctx), :read)
  end

  def sentinel_run_job(%{id: id}, %{context: %{cluster: cluster}}) do
    Sentinels.get_sentinel_run_job!(id)
    |> allow(cluster, :read)
  end

  def sentinel_run_jobs(%{id: id}, args, _) do
    SentinelRunJob.for_sentinel_run(id)
    |> SentinelRunJob.ordered()
    |> run_job_filters(args)
    |> paginate(args)
  end

  def cluster_sentinel_run_jobs(args, %{context: %{cluster: cluster}}) do
    SentinelRunJob.for_cluster(cluster.id)
    |> SentinelRunJob.pending()
    |> SentinelRunJob.ordered()
    |> paginate(args)
  end

  def create_sentinel(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Sentinels.create_sentinel(attrs, user)

  def update_sentinel(%{id: id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Sentinels.update_sentinel(attrs, id, user)

  def delete_sentinel(%{id: id}, %{context: %{current_user: user}}),
    do: Sentinels.delete_sentinel(id, user)

  def run_sentinel(%{name: name}, %{context: %{current_user: user}}) when is_binary(name) do
    sentinel = Sentinels.get_sentinel_by_name!(name)
    Sentinels.run_sentinel(sentinel.id, user)
  end
  def run_sentinel(%{id: id}, %{context: %{current_user: user}}) when is_binary(id),
    do: Sentinels.run_sentinel(id, user)
  def run_sentinel(_, _), do: {:error, "Must specify either id or name"}

  def update_sentinel_run_job(%{id: id, attributes: attrs}, %{context: %{cluster: cluster}}),
    do: Sentinels.update_sentinel_job(attrs, id, cluster)

  def sentinel_filters(query, args) do
    Enum.reduce(args, query, fn
      {:status, status}, q -> Sentinel.for_status(q, status)
      _, q -> q
    end)
  end

  def run_job_filters(query, args) do
    Enum.reduce(args, query, fn
      {:check, check}, q when not is_nil(check) -> SentinelRunJob.for_check(q, check)
      _, q -> q
    end)
  end
end
