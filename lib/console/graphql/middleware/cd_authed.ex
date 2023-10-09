defmodule Console.Middleware.CdAuthenticated do
  @behaviour Absinthe.Middleware
  alias Console.Deployments.{Services, Clusters}
  alias Console.Schema.{User, Service}

  def call(%{arguments: %{service_id: svc_id}, context: %{current_user: %User{} = user}} = res, _config) when is_binary(svc_id) do
    with {:ok, svc} <- Services.authorized(svc_id, user),
         %Service{cluster: cluster} = svc <- Console.Repo.preload(svc, [cluster: :provider]),
         %Kazan.Server{} = server <- Clusters.control_plane(cluster) do
       Kube.Utils.save_kubeconfig(server)
       put_in(res.context.service, svc)
    else
      :error -> Absinthe.Resolution.put_result(res, {:error, "could not fetch kubeconfig for cluster"})
      _ -> Absinthe.Resolution.put_result(res, {:error, "unauthenticated"})
    end
  end

  def call(res, opts) do
    perm = Keyword.get(opts, :perm) || :read
    Console.Middleware.Rbac.call(res, perm: perm, arg: :namespace)
  end
end
