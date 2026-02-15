defmodule Console.Pipelines.AI.Workbench.Producer do
  use Console.Pipelines.PollProducer
  import Console.Pipelines.AI.Base
  alias Console.Schema.WorkbenchJob

  def poll(demand) do
    if_enabled(fn ->
      WorkbenchJob.pollable()
      |> WorkbenchJob.with_limit(limit(demand))
      |> Repo.all()
    end)
  end
end
