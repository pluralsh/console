defmodule Console.Plural.Upgrades do
  use Console.Plural.Base
  alias Console.Plural.{UpgradeQueue}

  defmodule Mutation, do: defstruct [:createQueue, :pingCluster]

  def create_queue(attrs) do
    create_queue_mutation()
    |> Client.run(%{attributes: attrs}, %Mutation{createQueue: %UpgradeQueue{}})
    |> case do
      {:ok, %Mutation{createQueue: q}} -> {:ok, q}
      error -> error
    end
  end

  def ping_cluster(cluster_attrs, usage_attrs) do
    ping_cluster_mutation()
    |> Client.run(%{attributes: %{cluster: cluster_attrs, usage: usage_attrs}}, %Mutation{pingCluster: %UpgradeQueue{}})
    |> case do
      {:ok, %Mutation{pingCluster: q}} -> {:ok, q}
      error -> error
    end
  end
end
