defmodule Console.Middleware.CdAuthenticated do
  @behaviour Absinthe.Middleware
  alias Console.Deployments.{Services, Clusters}
  alias Console.Schema.{User, Service}

  def call(%{arguments: %{service_id: svc_id}, context: %{current_user: %User{} = user}} = res, opts) when is_binary(svc_id) do
    with {:ok, svc} <- check(Services, svc_id, user, opts[:perm]),
         %Service{cluster: cluster} = svc <- Console.Repo.preload(svc, [cluster: :provider]),
         %Kazan.Server{} = server <- Clusters.control_plane(cluster) do
       Kube.Utils.save_kubeconfig(server)
       res = put_in(res.context[:service], svc)
       put_in(res.context[:cluster], cluster)
    else
      :error -> Absinthe.Resolution.put_result(res, {:error, "could not fetch kubeconfig for cluster"})
      _ -> Absinthe.Resolution.put_result(res, {:error, "unauthenticated"})
    end
  end

  def call(%{arguments: %{cluster_id: cluster_id}, context: %{current_user: %User{} = user}} = res, opts) when is_binary(cluster_id) do
    with {:ok, cluster} <- check(Clusters, cluster_id, user, opts[:perm]),
         %Kazan.Server{} = server <- Clusters.control_plane(cluster) do
       Kube.Utils.save_kubeconfig(server)
       put_in(res.context[:cluster], cluster)
    else
      :error -> Absinthe.Resolution.put_result(res, {:error, "could not fetch kubeconfig for cluster"})
      _ -> Absinthe.Resolution.put_result(res, {:error, "unauthenticated"})
    end
  end

  def call(res, _opts), do: Absinthe.Resolution.put_result(res, {:error, "unauthenticated"})

  defp check(mod, id, user, :write), do: mod.write_authorized(id, user)
  defp check(mod, id, user, _), do: mod.authorized(id, user)
end
