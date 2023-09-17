defmodule Console.Deployments.Init do
  @moduledoc """
  Handles resolving chicken-eggs for setting up plural cd in a cluster
  """
  use Console.Services.Base
  alias Console.Services.Users
  alias Console.Deployments.{Clusters, Git}

  def setup() do
    bot = Users.get_bot!("console")
    start_transaction()
    |> add_operation(:provider, fn _ ->
      Clusters.create_provider(%{
        name: "#{Console.conf(:provider)}",
        namespace: "bootstrap"
      }, bot)
    end)
    |> add_operation(:deploy_repo, fn _ ->
      Git.create_repository(%{url: Git.deploy_url()}, bot)
    end)
    |> add_operation(:artifacts_repo, fn _ ->
      Git.create_repository(%{url: Git.artifacts_url()}, bot)
    end)
    |> add_operation(:cluster, fn _ ->
      Clusters.create_cluster(%{
        name: Console.conf(:cluster_name),
        self: true,
        version: "1.24"
      }, bot)
    end)
    |> execute()
  end
end
