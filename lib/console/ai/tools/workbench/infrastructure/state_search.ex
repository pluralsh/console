defmodule Console.AI.Tools.Workbench.Infrastructure.StateSearch do
  use Console.AI.Tools.Agent.Base
  alias Console.Repo
  alias Console.Deployments.{Policies, Stacks}
  alias Console.Schema.{Stack, User, StackState}

  require EEx

  embedded_schema do
    field :user,     :map, virtual: true
    field :stack_id, :string
    field :query,    :string
    field :limit,    :integer, default: 10
  end

  @valid ~w(stack_id query limit)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> check_uuid(:stack_id)
    |> validate_required(@valid -- [:limit])
    |> validate_number(:limit, greater_than: 0, less_than: 20)
  end

  @json_schema Console.priv_file!("tools/workbench/infrastructure/state_search.json") |> Jason.decode!()

  def json_schema(_), do: @json_schema
  def name(_), do: "plrl_state_search"
  def description(_), do: "Fuzzy searches the terraform/pulumi state of a stack with a given query."

  def implement(%__MODULE__{user: %User{} = user, stack_id: id, query: query}) do
    with %Stack{} = stack <- Stacks.get_stack(id),
         {:ok, stack} <- Policies.allow(stack, user, :read),
         %Stack{state: %StackState{state: [_ | _] = state}}  <- Repo.preload(stack, [:state]) do
      Enum.filter(state, &filter_state?(&1, query))
      |> Enum.map(&Console.mapify/1)
      |> Jason.encode()
    else
      {:error, err} ->
        {:error, "failed to get stack state, reason: #{inspect(err)}"}
      %Stack{} -> {:error, "stack #{id} has no state persisted yet"}
      nil -> {:error, "could not find stack with id #{id}"}
    end
  end

  defp filter_state?(%{} = resource, query) do
    String.contains?(resource.identifier || "", query) || String.contains?(resource.name || "", query) || String.contains?(resource.resource || "", query)
  end
end
