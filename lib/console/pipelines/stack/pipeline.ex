defmodule Console.Pipelines.Stack.Pipeline do
  use Console.Pipelines.Consumer
  import Console.Pipelines.Base
  alias Console.Deployments.Stacks

  def handle_event(stack) do
    Stacks.poll(stack)
    |> log("poll stack for a new run")

    Stacks.dequeue(refetch(stack))
    |> log("dequeue a new stack run")
  end
end
