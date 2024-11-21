defimpl Console.AI.Evidence, for: Console.Schema.StackState do
  use Console.AI.Evidence.Base
  import Console.AI.Fixer.Base
  alias Console.Repo
  alias Console.Deployments.Stacks
  alias Console.Schema.{StackState, StackRun}

  def generate(%StackState{run: %StackRun{} = run} = state),
    do: {:ok, [state_description(state) | fetch_code(run)]}

  def insight(%StackState{insight: insight}), do: insight

  def preload(state), do: Repo.preload(state, [:insight, run: [:stack, :cluster, :errors, :repository]])

  defp state_description(%StackState{run: %StackRun{} = run} = state) do
    {:user, """
    The Plural stack #{run.stack.name} has a terraform plan generated and the user will want to understand what it means, in particular:

    * expected blast radius of the change
    * if any critical systems can be affected by the change
    * whether it's safe to apply

    The plan itself is recorded below:

    ```
    #{state.plan}
    ```

    It is sourcing #{run.type} configuration from the git repository at #{run.repository.url} from the folder #{run.git.folder} at ref #{run.git.ref}.
    """}
  end

  defp fetch_code(%StackRun{} = run) do
    with {:ok, f} <- Stacks.tarstream(run),
         {:ok, msgs} <- code_prompt(f, run.git.folder, "I'll also include the relevant #{run.type} code below, listed in the format #{file_fmt()}") do
      msgs
    else
      _ -> []
    end
  end
end
