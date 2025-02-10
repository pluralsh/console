defimpl Console.AI.Evidence, for: Console.Schema.Stack do
  use Console.AI.Evidence.Base
  alias Console.AI.Worker
  alias Console.Schema.{AiInsight, Stack, StackRun}

  def custom(_), do: false

  def generate(%Stack{} = stack) do
    StackRun.for_stack(stack.id)
    |> StackRun.for_status(:failed)
    |> StackRun.ordered(desc: :id)
    |> StackRun.wet()
    |> StackRun.limit(1)
    |> Console.Repo.one()
    |> Worker.generate()
    |> Worker.await()
    |> run_insight()
    |> prepend(stack_description(stack))
    |> history()
  end

  def insight(%Stack{insight: insight}), do: insight

  def preload(comp), do: Console.Repo.preload(comp, [:cluster, :repository, insight: :evidence])

  defp stack_description(%Stack{} = stack) do
    {:user, """
    The following Plural Stack #{stack.name} is failing.  A stack is a deployment mechanism for infrastructure as code, this stack's IaC is #{stack.type}. On
    any push to a watched git repository, it will execute the command workflow for its configured IaC tool, and record any output and progress from the command.

    The stack is running on the cluster #{stack.cluster.name}

    It is sourcing #{stack.type} configuration from the git repository at #{stack.repository.url} from the folder #{stack.git.folder} at ref #{stack.git.ref}.

    We can find the latest failing run as well and show its details below.
    """}
  end

  defp run_insight({:ok, %AiInsight{text: text}}) when is_binary(text),
    do: [{:user, "the most recent run has the following brief summary of its failing status: #{text}"}]
  defp run_insight(_), do: []
end
