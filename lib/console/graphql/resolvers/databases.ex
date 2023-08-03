defmodule Console.GraphQl.Resolvers.Databases do
  alias Console.Services.Databases
  alias Console.GraphQl.Resolvers.Kubernetes
  alias Kube.Postgresql

  def resolve_postgres(%{namespace: ns, name: name}, _),
    do: Databases.get_postgres(ns, name)

  def list_postgres(_, _), do: Databases.list_postgres()

  def list_postgres_pods(%Postgresql{} = pg) do
    with {:ok, %{spec: %{selector: selector}}} <- Databases.statefulset(pg) do
      Kubernetes.list_pods(%{namespace: pg.metadata.namespace}, selector)
    end
  end

  def restore_postgres(%{namespace: ns, name: name, timestamp: ts} = attrs, _),
    do: Databases.restore_postgres(ns, name, ts, attrs[:clone] || %{})

  def list_postgres_instances(%Postgresql{} = pg), do: Databases.list_postgres_instances(pg)
end
