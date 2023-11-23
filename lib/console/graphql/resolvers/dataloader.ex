
defmodule Console.GraphQl.Resolvers.HelmRepositoryLoader do
  alias Console.Deployments.Git

  def data(_) do
    Dataloader.KV.new(&query/2, max_concurrency: 1)
  end

  def query(_, services) do
    repos = fetch_repos()
    Map.new(services, & {&1, !repos[key(&1)]})
  end

  def fetch_repos() do
    case Git.list_helm_repositories() do
      {:ok, repos} ->
        Map.new(repos, & {{&1.namespace, &1.name}, &1})
      _ -> %{}
    end
  end

  defp key(%{helm: %{repository: %{namespace: ns, name: n}}}), do: {ns, n}
  defp key(_), do: nil
end

defmodule Console.GraphQl.Resolvers.UserLoader do
  alias Console.Schema.User

  def data(_) do
    Dataloader.KV.new(&query/2, max_concurrency: 1)
  end

  def query(_, emails) do
    users = fetch_users(emails)
    Map.new(emails, & {&1, users[&1]})
  end

  def fetch_users(emails) do
    MapSet.to_list(emails)
    |> User.with_emails()
    |> Console.Repo.all()
    |> Map.new(& {&1.email, &1})
  end
end
