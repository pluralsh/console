defmodule Console.Pipelines.AI.WorkbenchCron.Producer do
  use Console.Pipelines.PollProducer
  import Console.Pipelines.AI.Base
  alias Console.Schema.WorkbenchCron

  def poll(demand) do
    if_enabled(fn ->
      WorkbenchCron.executable()
      |> WorkbenchCron.with_limit(limit(demand))
      |> Repo.all()
    end)
  end
end
