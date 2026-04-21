defmodule Console.AI.Tools.Workbench.Infrastructure.StackList do
  use Console.AI.Tools.Agent.Base
  alias Console.Repo
  alias Console.Schema.{Stack, User}

  embedded_schema do
    field :user, :map, virtual: true
    field :q, :string
    field :project_id, :string
    field :status, Console.Schema.Stack.Status
  end

  @valid ~w(q project_id status)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
  end

  @json_schema Console.priv_file!("tools/workbench/infrastructure/stack_list.json") |> Jason.decode!()

  def json_schema(_), do: @json_schema
  def name(_), do: "plrl_stacks"
  def description(_), do: "List infrastructure stacks the user can read. Returns compact JSON; use plrl_stack with a stack id for full details."

  def implement(%__MODULE__{user: %User{} = user} = args) do
    Stack.for_user(user)
    |> stack_filters(args)
    |> maybe_search(args.q)
    |> Stack.distinct()
    |> Stack.ordered()
    |> Repo.all()
    |> Repo.preload([:cluster, :project])
    |> Enum.map(&stack_brief/1)
    |> Jason.encode()
  end

  defp stack_filters(query, %__MODULE__{project_id: pid, status: st}) do
    query
    |> maybe_project(pid)
    |> maybe_status(st)
  end

  defp maybe_project(q, pid) when is_binary(pid) and pid != "", do: Stack.for_project(q, pid)
  defp maybe_project(q, _), do: q

  defp maybe_status(q, s) when not is_nil(s), do: Stack.for_status(q, s)
  defp maybe_status(q, _), do: q

  defp maybe_search(query, q) when is_binary(q) and byte_size(q) > 0,
    do: Stack.search(query, q)
  defp maybe_search(query, _), do: query

  defp stack_brief(%Stack{} = s) do
    %{
      id: s.id,
      name: s.name,
      type: s.type,
      status: s.status,
      approval: s.approval,
      cluster_id: s.cluster_id,
      cluster_handle: s.cluster && s.cluster.handle,
      project_id: s.project_id,
      project_name: s.project && s.project.name
    }
  end
end
