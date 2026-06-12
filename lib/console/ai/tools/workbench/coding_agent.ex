defmodule Console.AI.Tools.Workbench.CodingAgent do
  use Console.AI.Tools.Workbench.Base
  import Console.Deployments.Pr.Git, only: [to_http: 2]
  alias Console.AI.Tool
  alias Console.Schema.{User, AgentRuntime, AgentRun, Workbench, WorkbenchJob}
  alias Console.Deployments.Agents

  embedded_schema do
    field :activity,     :map, virtual: true
    field :workbench,    :map, virtual: true
    field :job,          :map, virtual: true
    field :mode,         AgentRun.Mode
    field :babysit,      :boolean
    field :approval,     :boolean
    field :repository,   :string
    field :base_branch,  :string
    field :prompt,       :string
  end

  @valid ~w(mode repository base_branch prompt babysit approval)a

  def changeset(%__MODULE__{workbench: bench, job: job} = model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required(@valid -- [:base_branch, :babysit, :approval])
    |> fix_mode(bench, job)
    |> fix_babysit(bench, job)
    |> fix_approval(bench, job)
    |> validate_repository(bench)
  end

  defp fix_mode(cs, _, %WorkbenchJob{modes: %WorkbenchJob.Modes{plan: true}}) do
    case get_change(cs, :mode) do
      :write -> add_error(cs, :mode, "write mode is not allowed for workbench jobs that specify planning mode")
      _ -> cs
    end
  end
  defp fix_mode(cs, %Workbench{configuration: %{coding: %{mode: :read}}}, _) do
    case get_change(cs, :mode) do
      :write -> add_error(cs, :mode, "write mode is not allowed for workbenches that specify read-only coding agents")
      _ -> cs
    end
  end
  defp fix_mode(cs, _, _), do: cs

  defp fix_babysit(cs, _, %WorkbenchJob{modes: %WorkbenchJob.Modes{coding: %{babysit: true}}}),
    do: put_change(cs, :babysit, true)
  defp fix_babysit(cs, %Workbench{configuration: %{coding: %{enable_babysitting: true}}}, _), do: cs
  defp fix_babysit(cs, _, _), do: put_change(cs, :babysit, false)

  defp fix_approval(cs, _, %WorkbenchJob{modes: %WorkbenchJob.Modes{coding: %{approval: true}}}),
    do: put_change(cs, :approval, true)
  defp fix_approval(cs, _, _), do: put_change(cs, :approval, false)

  defp validate_repository(cs, %Workbench{configuration: %{coding: %{repositories: [_ | _] = repos}}}) do
    conn = Tool.agent_runtime() |> Agents.scm_connection()
    repos = Enum.map(repos, &to_http(conn, &1))

    case get_field(cs, :repository) do
      val when is_binary(val) ->
        put_change(cs, :repository, to_http(conn, val))
      _ -> cs
    end
    |> validate_inclusion(
      :repository,
      repos,
      message: "coding agents are restricted to just the [#{Enum.join(repos, ", ")}] repository urls"
    )
  end
  defp validate_repository(cs, _), do: cs

  @json_schema Console.priv_file!("tools/workbench/coding_agent.json") |> Jason.decode!()

  def json_schema(_), do: @json_schema
  def name(_), do: "workbench_coding_agent"
  def description(_), do: "Invokes a coding agent to make a code change with the given prompt and repository.  Only use this once you've gathered enough information to craft an effective prompt to either analyze the code in question or modify it and generate a reviewable PR."

  @run_attrs ~w(mode repository prompt activity babysit approval)a

  def implement(%__MODULE__{id: tool} = args) do
    with {:user, %User{} = user} <- {:user, Tool.actor()},
         {:runtime, %AgentRuntime{} = runtime} <- {:runtime, Tool.agent_runtime()},
         {:ok, run} <- Agents.create_agent_run(run_args(args), runtime.id, user) do
      {:ok, %{run | tool: tool}}
    else
      {:user, _} -> {:error, "no actor found for this session"}
      {:runtime, _} -> {:error, "no runtime found, you need to manually specify this in the chat context menu"}
      err -> err
    end
  end

  defp run_args(tool) do
    Map.take(tool, @run_attrs)
    |> Map.put(:branch, tool.base_branch)
  end
end
