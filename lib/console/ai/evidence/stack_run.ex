defimpl Console.AI.Evidence, for: Console.Schema.StackRun do
  use Console.AI.Evidence.Base
  import Console.AI.Fixer.Base
  alias Console.Repo
  alias Console.Deployments.Stacks
  alias Console.Schema.{StackRun, RunStep, StackState}

  require Logger

  def custom(_), do: false

  def generate(%StackRun{steps: steps} = run) do
    Enum.filter(steps, & &1.status == :failed)
    |> Repo.preload([:logs])
    |> Enum.map(&step_message/1)
    |> Enum.concat(error_messages(run))
    |> Enum.concat(fetch_code(run))
    |> prepend(plan(run))
    |> prepend(step_description(run))
    |> history()
  end

  def insight(%StackRun{insight: insight}), do: insight

  def preload(comp), do: Console.Repo.preload(comp, [:stack, :state, :insight, :steps, :cluster, :errors, :repository])

  defp step_description(%StackRun{} = run) do
    {:user, """
    The Plural stack #{run.stack.name} has a failing run, some important details for this are as follows:

    It is running on the cluster #{run.cluster.name}

    It is sourcing #{run.type} configuration from the git repository at #{run.repository.url} from the folder #{run.git.folder} at ref #{run.git.ref}.

    We can also show the failing commands in this stack and their run logs below.
    """}
  end

  defp step_message(%RunStep{logs: logs, cmd: cmd, args: args}) do
    logs = Enum.map(logs, & &1.logs)
          |> Enum.join("")
    {:user, "The stack run has a failing command `#{cmd} #{Enum.join(args, " ")}, with logs: #{logs}"}
  end

  defp error_messages(%StackRun{errors: [_ | _] = errors}) do
    Enum.map(errors, & {:user, "an error with source #{&1.source} and message #{&1.message}"})
    |> prepend({:user, "the run also has some Plural-level system errors listed below: "})
  end
  defp error_messages(_), do: []

  defp plan(%StackRun{type: :terraform, state: %StackState{plan: p}}) when is_binary(p) and byte_size(p) > 0 do
    [{:user, "the terraform run also has an associate terraform plan that could be useful below:\n#{p}"}]
  end
  defp plan(_), do: []

  defp fetch_code(%StackRun{} = run) do
    with {:ok, f} <- Stacks.tarstream(run),
         {:ok, msgs} <- code_prompt(f, run.git.folder, "I'll also include the relevant #{run.type} code below, listed in the format #{file_fmt()}") do
      msgs
    else
      _ -> []
    end
  end
end
