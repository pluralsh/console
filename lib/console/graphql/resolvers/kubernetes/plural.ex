defmodule Console.GraphQl.Resolvers.Kubernetes.Plural do
  alias Console.Deployments.{Clusters, Services, Git}

  def cluster(%{status: %{id: id}}, _, _) when is_binary(id), do: {:ok, Clusters.get_cluster(id)}
  def cluster(_, _, _), do: {:ok, nil}

  def service(%{status: %{id: id}}, _, _) when is_binary(id), do: {:ok, Services.get_service(id)}
  def service(_, _, _), do: {:ok, nil}

  def git_repository(%{status: %{id: id}}, _, _) when is_binary(id), do: {:ok, Git.get_repository(id)}
  def git_repository(_, _, _), do: {:ok, nil}
end
