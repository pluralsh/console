defmodule Console.AI.Tools.Workbench.Infrastructure.Projects do
  use Console.AI.Tools.Agent.Base
  alias Console.Repo
  alias Console.Schema.{Project, User}

  embedded_schema do
    field :user, :map, virtual: true
    field :q, :string
  end

  @valid ~w(q)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
  end

  @json_schema Console.priv_file!("tools/workbench/infrastructure/projects.json") |> Jason.decode!()

  def json_schema(_), do: @json_schema
  def name(_), do: "plrl_projects"
  def description(_), do: "List projects the current user can read. Returns compact JSON; use plrl_project with a handle for full details."

  def implement(%__MODULE__{user: %User{} = user, q: q}) do
    Project.ordered()
    |> Project.for_user(user)
    |> maybe_search(q)
    |> Repo.all()
    |> Enum.map(&project_brief/1)
    |> Jason.encode()
  end

  defp maybe_search(query, q) when is_binary(q) and byte_size(q) > 0,
    do: Project.search(query, q)
  defp maybe_search(query, _), do: query

  defp project_brief(%Project{} = p) do
    %{
      id: p.id,
      name: p.name,
    }
  end
end
