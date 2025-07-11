defmodule Console.AI.Agents.Terraform do
  use Console.AI.Agents.Base
  import Console.AI.Evidence.Base, only: [prepend: 2]
  alias Console.Schema.{StackRun, StackState, RunStep}
  alias Console.Repo

  def handle_cast({:enqueue, %StackRun{status: :failed} = run}, {thread, session}) do
    Logger.info("found failed terraform run in agent session #{session.id}")
    case failed_run_messages(run) do
      [_ | _] = messages ->
        Logger.info("handling failed terraform run in agent session #{session.id}")
        drive(thread, messages, session.user)
        |> handle_result(thread, session)
      _ -> {:noreply, {thread, session}}
    end
  end

  def handle_cast({:enqueue, %StackRun{} = run}, {thread, session}) do
    Logger.info("found successful terraform run in agent session #{session.id}")
    case Repo.preload(run, [:state]) do
      %StackRun{state: %StackState{plan: p}} when is_binary(p) and byte_size(p) > 0 ->
        Logger.info("handling successful terraform run in agent session #{session.id}")
        drive(thread, [
          {:user, """
          The Plural stack #{run.stack.name} has a generated a plan for the following pr, can you ensure the changes are as desired and if everything is good, feel free to ignore:

          #{p}
          """}
        ], session.user)
        |> handle_result(thread, session)
      _ -> {:noreply, {thread, session}}
    end
  end

  defp failed_run_messages(%StackRun{} = run) do
    case Repo.preload(run, [:steps]) do
      %StackRun{steps: [_ | _] = steps} ->
        Enum.map(steps, &step_message/1)
        |> prepend({:user, "The stack run has failed, I'll list the logs explaining the failure, and perhaps they can inform any necessary code changes."})
      _ ->
        []
    end
  end

  defp step_message(%RunStep{logs: logs, cmd: cmd, args: args}) do
    logs = Enum.map(logs, & &1.logs)
          |> Enum.join("")
    {:user, "The stack run has a failing command `#{cmd} #{Enum.join(args, " ")}, with logs: #{logs}"}
  end

  defp handle_result({:ok, thread, session}, _, _), do: {:noreply, {thread, session}}
  defp handle_result(err, thread, session) do
    Logger.info "terraform agent thread failure: #{inspect(err)}"
    {:noreply, {thread, session}}
  end
end
