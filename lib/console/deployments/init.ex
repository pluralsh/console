defmodule Console.Deployments.Init do
  @moduledoc """
  Handles resolving chicken-eggs for setting up plural cd in a cluster
  """
  use Console.Services.Base
  alias Console.Services.Users
  alias Console.Deployments.{Clusters, Git, Settings}

  def setup() do
    bot = %{Users.get_bot!("console") | roles: %{admin: true}}
    start_transaction()
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
        handle: "mgmt",
        version: "1.24"
      }, bot)
    end)
    |> add_operation(:provider, fn _ ->
      Clusters.create_provider(%{
        name: "#{Console.conf(:provider)}",
        namespace: "bootstrap",
        self: true,
        cloud: "#{Console.conf(:provider)}"
      }, bot)
    end)
    |> add_operation(:settings, fn %{deploy_repo: drepo, artifacts_repo: arepo} ->
      Settings.create(%{
        name: "global",
        artifact_repository_id: arepo.id,
        deployer_repository_id: drepo.id,
      })
    end)
    |> execute()
  end
end
