defmodule Console.ClusterRing do
  @moduledoc """
  Implements rendezvous hashing for node selection.  The algorithm is super simple:
  1. Compute a hash of the pair {node, key} for each node in the cluster
  2. Take the maximum value, that's the node to hash to
  """

  def node(key) do
    Node.list([:this, :visible])
    |> Enum.max_by(&:erlang.phash2({&1, key}))
  end
end
