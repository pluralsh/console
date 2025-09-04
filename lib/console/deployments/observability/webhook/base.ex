defmodule Console.Deployments.Observability.Webhook.Base do
  alias Console.Deployments.{Settings, Clusters, Services, Flows}
  use Nebulex.Caching

  @cache Console.conf(:cache_adapter)
  @ttl :timer.minutes(30)

  @decorate cacheable(cache: @cache, key: {:obs_hook_associations, :project, name}, opts: [ttl: @ttl])
  def project(name), do: Settings.get_project_by_name(name) |> maybe_id()

  @decorate cacheable(cache: @cache, key: {:obs_hook_associations, :cluster, name}, opts: [ttl: @ttl])
  def cluster(name), do: Clusters.get_cluster_by_handle(name) |> maybe_id()

  @decorate cacheable(cache: @cache, key: {:obs_hook_associations, :flow, name}, opts: [ttl: @ttl])
  def flow(name), do: Flows.get_by_name(name) |> maybe_id()

  @decorate cacheable(cache: @cache, key: {:obs_hook_associations, :svc, name}, opts: [ttl: @ttl])
  def service(name) do
    case String.split(name, "/") do
      [handle, name] -> Services.get_service_by_handle(handle, name) |> maybe_id()
      _ -> nil
    end
  end

  @decorate cacheable(cache: @cache, key: {:obs_hook_associations, :svc, cid, name}, opts: [ttl: @ttl])
  def service(cid, name), do: Services.get_service_by_name(cid, name) |> maybe_id()

  defp maybe_id(%{id: id}), do: id
  defp maybe_id(_), do: nil
end
