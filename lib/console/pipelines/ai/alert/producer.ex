defmodule Console.Pipelines.AI.Alert.Producer do
  use Console.Pipelines.PollProducer
  import Console.Pipelines.AI.Base
  alias Console.Schema.Alert

  def poll(demand) do
    if_enabled(fn ->
      Alert.firing()
      |> Alert.ai_pollable()
      |> Alert.with_limit(limit(demand))
      |> Repo.all()
    end)
  end
end
