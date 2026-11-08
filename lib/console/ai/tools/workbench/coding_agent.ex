defmodule Console.AI.Tools.Workbench.CodingAgent do
  use Console.AI.Tools.Workbench.Base
  import Console.Deployments.Pr.Git, only: [to_http: 2]
  alias Console.AI.Tool
  alias Console.Schema.{User, AgentRuntime, AgentRun, Workbench, WorkbenchJob, WorkbenchJobActivity}
  alias Console.Deployments.{Agents, Workbenches}
  alias Console.PseudoFS

  embedded_schema do
    field :activity,        :map, virtual: true
    field :created_activity, :boolean, virtual: true, default: false
    field :workbench,       :map, virtual: true
    field :job,             :map, virtual: true
    field :skills,          :map, virtual: true
    field :mode,            AgentRun.Mode
    field :babysit,         :boolean
    field :approval,        :boolean
    field :followup,        :boolean
    field :pr_url,          :string
    field :repository,      :string
    field :base_branch,     :string
    field :head_branch,     :string
    field :prompt,          :string
    field :attachments,     {:array, :string}
  end

  @valid ~w(mode repository base_branch head_branch prompt babysit approval followup pr_url attachments)a

  def changeset(%__MODULE__{workbench: bench, job: job} = model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required(@valid -- [:base_branch, :head_branch, :babysit, :approval, :followup, :pr_url, :attachments])
    |> fix_mode(bench, job)
    |> AgentRun.validate_followup_mode()
    |> fix_babysit(bench, job)
    |> fix_approval(bench, job)
    |> validate_repository(bench)
    |> validate_followup()
    |> validate_review_branch()
    |> validate_attachments()
  end

  defp validate_attachments(cs) do
    case {get_field(cs, :attachments), PseudoFS.enabled?()} do
      {[_ | _], false} -> add_error(cs, :attachments, "file attachments require the workbench filesystem to be enabled")
      _ -> cs
    end
  end

  defp fix_mode(cs, bench, job) do
    case {get_field(cs, :mode), WorkbenchJob.coding_review?(job)} do
      {:review, false} -> add_error(cs, :mode, "review mode is not enabled for this workbench job")
      _ -> fix_write_mode(cs, bench, job)
    end
  end

  defp fix_write_mode(cs, _, %WorkbenchJob{modes: %WorkbenchJob.Modes{plan: true}}) do
    case get_change(cs, :mode) do
      :write -> add_error(cs, :mode, "write mode is not allowed for workbench jobs that specify planning mode")
      _ -> cs
    end
  end
  defp fix_write_mode(cs, %Workbench{configuration: %{coding: %{mode: :read}}}, _) do
    case get_change(cs, :mode) do
      :write -> add_error(cs, :mode, "write mode is not allowed for workbenches that specify read-only coding agents")
      _ -> cs
    end
  end
  defp fix_write_mode(cs, _, _), do: cs

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
  @review_json_schema Console.priv_file!("tools/workbench/coding_agent_review.json") |> Jason.decode!()

  def json_schema(%__MODULE__{job: job}) do
    case WorkbenchJob.coding_review?(job) do
      true -> @review_json_schema
      _ -> @json_schema
    end
    |> maybe_attachments()
  end
  def json_schema(_), do: maybe_attachments(@json_schema)

  defp maybe_attachments(schema) do
    case PseudoFS.enabled?() do
      true -> schema
      false -> update_in(schema, ["properties"], &Map.delete(&1, "attachments"))
    end
  end
  def name(_), do: "workbench_coding_agent"
  def description(%__MODULE__{job: job}) do
    case WorkbenchJob.coding_review?(job) do
      true ->
        "Invokes a coding agent to analyze a repository, make a code change, or review an existing pull request. Review mode is enabled for this job. For pull request review tasks you MUST set mode=review, base_branch to the PR's head branch (the branch containing the changes, not the PR target), and pr_url to the pull request URL. Only use this once you've gathered enough information to craft an effective prompt."
      _ ->
        "Invokes a coding agent to analyze a repository or make a code change. Only use this once you've gathered enough information to craft an effective prompt."
    end
  end
  def description(_), do: "Invokes a coding agent to analyze a repository or make a code change. Only use this once you've gathered enough information to craft an effective prompt."

  @run_attrs ~w(mode repository prompt activity babysit approval followup head_branch attachments)a

  def implement(%__MODULE__{id: tool} = args) do
    with {:user, %User{} = user} <- {:user, Tool.actor()},
         {:runtime, %AgentRuntime{} = runtime} <- {:runtime, Tool.agent_runtime()},
         {:ok, args} <- ensure_activity(args) do
      case Agents.create_agent_run(run_args(args), runtime.id, user) do
        {:ok, run} ->
          republish_activity(args)
          {:ok, %{run | tool: tool}}
        err -> fail_activity(args, err)
      end
    else
      {:user, _} -> {:error, "no actor found for this session"}
      {:runtime, _} -> {:error, "no runtime found, you need to manually specify this in the chat context menu"}
      err -> err
    end
  end

  # runs spawned by the engine get their own activity, which must exist before the run so the run is
  # linked to the workbench job (attachments and pr bookkeeping resolve the job through it)
  defp ensure_activity(%__MODULE__{activity: %WorkbenchJobActivity{}} = args), do: {:ok, args}
  defp ensure_activity(%__MODULE__{job: %WorkbenchJob{id: id} = job, prompt: prompt, id: tool} = args) when is_binary(id) do
    %{type: :coding, status: :pending, prompt: prompt, tool_call: tool_call(tool)}
    |> Workbenches.create_job_activity(job)
    |> case do
      {:ok, activity} -> {:ok, %{args | activity: activity, created_activity: true}}
      err -> err
    end
  end
  defp ensure_activity(args), do: {:ok, args}

  # the association is broadcast from within create_agent_run's transaction, before the run is visible to
  # subscription resolvers, so rebroadcast once committed for the ui to pick up the run
  defp republish_activity(%__MODULE__{activity: %WorkbenchJobActivity{id: id}, created_activity: true}) do
    case Workbenches.get_workbench_job_activity(id) do
      %WorkbenchJobActivity{} = activity -> Workbenches.notify({:ok, activity}, :update)
      _ -> :ok
    end
  end
  defp republish_activity(_), do: :ok

  defp fail_activity(%__MODULE__{activity: %WorkbenchJobActivity{} = activity, created_activity: true}, err) do
    Workbenches.update_job_activity(%{status: :failed, result: %{error: "failed to create agent run: #{format_error(err)}"}}, activity)
    err
  end
  defp fail_activity(_, err), do: err

  defp tool_call(%Tool{id: id, name: name, arguments: args}) when is_binary(id),
    do: %{call_id: id, name: name, arguments: args}
  defp tool_call(_), do: %{name: name(nil)}

  defp format_error({:error, %Ecto.Changeset{} = cs}),
    do: Enum.join(Console.GraphQl.Helpers.resolve_changeset(cs), ", ")
  defp format_error({:error, msg}) when is_binary(msg), do: msg
  defp format_error(err), do: inspect(err)

  defp run_args(tool) do
    Map.take(tool, @run_attrs)
    |> Map.put(:skills, skills(tool.skills))
    |> Map.put(:followup_pr_url, tool.pr_url)
    |> case do
      %{followup: true} = args -> args
      %{mode: :review} = args ->
        args
        |> Map.drop([:head_branch])
        |> Map.put(:branch, tool.base_branch)
      args ->
        args
        |> Map.drop([:head_branch, :followup_pr_url])
        |> Map.put(:branch, tool.base_branch)
    end
  end

  defp validate_followup(cs) do
    case get_field(cs, :followup) do
      true -> validate_required(cs, [:head_branch, :pr_url])
      _ -> cs
    end
  end

  defp validate_review_branch(cs) do
    case get_field(cs, :mode) do
      :review -> validate_required(cs, [:base_branch, :pr_url])
      _ -> cs
    end
  end

  @skill_attrs ~w(name description contents)a

  defp skills(%{} = skills), do: skills(Map.values(skills))
  defp skills([_ | _] = skills) do
    Enum.map(skills, fn
      %{} = skill -> Map.take(skill, @skill_attrs)
      _ -> nil
    end)
    |> Enum.reject(&is_nil/1)
  end
  defp skills(_), do: []
end
