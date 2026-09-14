defmodule Console.AI.Workbench.Subagents.Monitoring do
  use Console.AI.Workbench.Subagents.Base
  alias Console.AI.Tools.Workbench.{Codemode, History, Monitoring, Result, Scratchpad}
  alias Console.AI.Workbench.{Environment, MCP}
  alias Console.AI.Workbench.Subagents.Observability
  alias Console.Schema.{WorkbenchJob, WorkbenchJobActivity}
  import Console.AI.Workbench.Environment, only: [engine_opts: 1]

  require EEx

  def run(
        %WorkbenchJobActivity{prompt: prompt} = activity,
        %WorkbenchJob{} = job,
        %Environment{} = environment
      ) do
    tools = tools(environment, job)

    MemoryEngine.new(tools, 50,
      engine_opts(environment) ++
        [
          system_prompt:
            &String.trim(system_prompt(prompt: WorkbenchJob.objective(job), engine: &1)),
          acc: %{},
          callback: &callback(activity, environment, &1),
          tool_search: length(tools) > 10,
          pre_enable: [Result | skill_knowledge_pre_enable()],
          continue_msg: cont_msg()
        ]
    )
    |> MemoryEngine.reduce([{:user, prompt}], &reducer/2)
    |> case do
      {:ok, attrs} ->
        attrs

      {:error, error} ->
        %{
          status: :failed,
          result: %{error: "error running monitoring subagent: #{inspect(error)}"}
        }
    end
  end

  def tools(%Environment{} = environment, %WorkbenchJob{user: user} = job) do
    skills = Environment.subagent_skills(environment.skills, :monitoring)

    Observability.core_tools(job, environment, user)
    |> Enum.concat(
      MCP.expand_tools(
        Environment.subagent_tools(environment.tools, :observability),
        job
      )
    )
    |> Enum.concat(Monitoring.read_tools(job))
    |> Enum.concat(Monitoring.write_tools(job, user))
    |> Enum.concat(
      skill_knowledge_tools(job, skills) ++
        [
          Scratchpad,
          Result,
          %Codemode{tools: []},
          %History{job: job, activities: environment.activities}
        ]
    )
  end

  defp reducer(messages, _) do
    case Enum.find(messages, &match?(%Result{}, &1)) do
      %Result{output: output} ->
        {:halt, %{status: :successful, result: %{output: output}}}

      _ ->
        last_message(messages, fn error ->
          {:cont, %{status: :failed, result: %{error: error}}}
        end)
    end
  end

  EEx.function_from_file(
    :defp,
    :system_prompt,
    Console.priv_filename(["prompts", "workbench", "monitoring.md.eex"]),
    [:assigns]
  )
end
