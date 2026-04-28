defmodule Console.AI.Tools.Workbench.SkillUpdate do
  use Console.AI.Tools.Workbench.Base
  alias Console.Schema.{WorkbenchSkill, WorkbenchJob, Workbench, PullRequest}
  alias Console.AI.Tools.Pr
  alias Console.AI.Workbench.Skills
  alias Console.AI.File.Editor

  defmodule Result do
    defstruct [:result]
  end

  embedded_schema do
    field :skills,      :map, virtual: true
    field :job,         :map, virtual: true
    field :name,        :string
    field :previous,    :string
    field :replacement, :string
    field :branch_name, :string
    field :pr_title,    :string
    field :pr_description, :string
    field :commit_message, :string
  end

  @json_schema Console.priv_file!("tools/workbench/skill_update.json") |> Jason.decode!()

  def json_schema(_), do: @json_schema
  def name(_), do: "workbench_skill_update"
  def description(_), do: "Updates a skill by replacing an exact `previous` snippet with `replacement`, and opens a PR using the given branch name, title, and description."

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:name, :previous, :replacement, :branch_name, :pr_title, :pr_description])
    |> validate_required([:name, :previous, :replacement, :branch_name, :pr_title, :pr_description])
  end

  def implement(%__MODULE__{} = model), do: {:ok, model}

  def execute(%__MODULE__{job: job, name: name, previous: previous, replacement: replacement} = model) do
    case Skills.plural?(name, job.workbench) do
      true -> plural_update(job, name, previous, replacement)
      false -> git_update(model)
    end
  end

  defp plural_update(%WorkbenchJob{workbench: %Workbench{workbench_skills: skills}}, name, prev, replace) do
    with %WorkbenchSkill{} = ws <- Enum.find(skills, & &1.name == name),
         {:ok, new} <- Editor.sreplace(ws.contents, prev, replace) do
      WorkbenchSkill.changeset(ws, %{contents: new})
      |> Console.Repo.update()
      |> case do
        {:ok, skill} -> {:ok, %Result{result: skill}}
        err -> err
      end
    end
  end

  defp git_update(%__MODULE__{job: job, name: name, previous: previous, replacement: replacement} = mod)  do
    with {:ok, {repo, branch, path}} <- Skills.skill_file(name, job.workbench),
         {:ok, attrs} <- Pr.implement(%Pr{
                            repo_url: repo.url,
                            branch_name: branch,
                            commit_message: mod.commit_message,
                            pr_title: mod.pr_title,
                            pr_description: mod.pr_description,
                            file_updates: [%{file_name: path, previous: previous, replacement: replacement}]
                          }) do
      ctx = Console.AI.Tool.context()
      %PullRequest{author_id: ctx.user.id}
      |> PullRequest.changeset(Map.merge(context_attrs(ctx), attrs))
      |> Console.Repo.insert()
      |> case do
        {:ok, pr} -> {:ok, %Result{result: pr}}
        err -> err
      end
    end
  end

  defp context_attrs(ctx) do
    Map.from_struct(ctx)
    |> Enum.reduce(%{}, fn
      {:job, %{id: id}}, acc -> Map.put(acc, :workbench_job_id, id)
      {:stack, %{id: id}}, acc -> Map.put(acc, :stack_id, id)
      {:cluster, %{id: id}}, acc -> Map.put(acc, :cluster_id, id)
      {:service, %{id: id}}, acc -> Map.put(acc, :service_id, id)
      _, acc -> acc
    end)
  end
end
