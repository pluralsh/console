defmodule Console.Pipelines.Stack.Pipeline do
  use Flow
  import Console.Pipelines.Base
  require Logger
  alias Console.Deployments.Stacks

  def start_link(producer) do
    Flow.from_stages([producer], stages: 15, max_demand: 2)
    |> Flow.map(fn stack ->
      Logger.info "polling repository for #{stack.__struct__} #{stack.id}"
      Stacks.poll(stack)
      |> log("poll stack for a new run")

      Stacks.dequeue(refetch(stack))
      |> log("dequeue a new stack run")
    end)
    |> Flow.start_link()
  end
end
