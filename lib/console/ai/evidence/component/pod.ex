defmodule Console.AI.Evidence.Component.Pod do
  use Console.AI.Evidence.Base
  alias Console.AI.Evidence.Component.Resource

  def hydrate(%CoreV1.Pod{} = pod) do
    Resource.events(pod)
    |> default_empty(&tpl_events/1)
  end
  def hydrate(_), do: {:ok, []}
end
