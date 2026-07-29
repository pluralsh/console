defmodule Console.Pipelines.AI.QueuedPrompt.Pipeline do
  use Console.Pipelines.Consumer
  alias Console.Schema.QueuedPrompt
  alias Console.Deployments.Workbenches

  def handle_event(%QueuedPrompt{} = prompt), do: Workbenches.dequeue_prompt(prompt)
end
