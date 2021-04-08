defmodule Watchman.Forge.Upgrades do
  use Watchman.Forge.Base
  alias Watchman.Forge.{UpgradeQueue}

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
