defmodule Console.GraphQl.Complexity do
  @moduledoc """
  Reusable complexity functions for absinthe's `complexity` macro, eg `complexity &Console.GraphQl.Complexity.paginated/2`.
  """

  @doc """
  Costs a connection at its children's complexity times the requested page size.
  """
  @spec paginated(map, non_neg_integer) :: non_neg_integer
  def paginated(args, child_complexity),
    do: (Map.get(args, :first) || Map.get(args, :last) || 1) * child_complexity
end
