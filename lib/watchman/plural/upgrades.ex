defmodule Watchman.Plural.Upgrades do
  use Watchman.Plural.Base
  alias Watchman.Plural.{UpgradeQueue}

  defmodule Mutation, do: defstruct [:createQueue]

  def create_queue(attrs) do
    create_queue_mutation()
    |> Client.run(%{attributes: attrs}, %Mutation{createQueue: %UpgradeQueue{}})
    |> case do
      {:ok, %Mutation{createQueue: q}} -> {:ok, q}
      error -> error
    end
  end
end
