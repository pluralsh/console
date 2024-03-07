defmodule Console.Deployments.Policy do
  use Console.Services.Base
  alias Console.Schema.{PolicyConstraint, Cluster}

  @doc """
  Returns a constraint if present or nil otherwise
  """
  @spec get_constraint(binary) :: PolicyConstraint.t | nil
  def get_constraint(id), do: Repo.get(PolicyConstraint, id)

  @doc """
  Upserts a set of OPA constraints and returns the count of all added
  """
  @spec upsert_constraints([map], Cluster.t) :: {:ok, integer} | Console.error
  def upsert_constraints(constraints, %Cluster{id: id}) do
    Enum.reduce(constraints, start_transaction(), fn %{name: name} = constraint, xact ->
      add_operation(xact, name, fn _ ->
        case Repo.get_by(PolicyConstraint, cluster_id: id, name: name) do
          %PolicyConstraint{} = constraint -> Repo.preload(constraint, [:violations])
          nil -> %PolicyConstraint{cluster_id: id}
        end
        |> PolicyConstraint.changeset(constraint)
        |> Repo.insert_or_update()
      end)
    end)
    |> add_operation(:wipe, fn _ ->
      names = Enum.map(constraints, &Map.get(&1, :name))
              |> Enum.filter(& &1)
      PolicyConstraint.for_cluster(id)
      |> PolicyConstraint.without_names(names)
      |> Repo.delete_all()
      |> ok()
    end)
    |> execute()
    |> case do
      {:ok, res} -> {:ok, map_size(res)}
      err -> err
    end
  end
end
