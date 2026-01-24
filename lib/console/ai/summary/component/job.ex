defmodule Console.AI.Summary.Component.Job do
  use Console.AI.Evidence.Base

  def hydrate(%BatchV1.Job{metadata: %{namespace: ns}, spec: %{selector: selector}}) do
    some_pods(ns, selector)
    |> default_empty(&pod_messages("job", &1))
  end
  def hydrate(_), do: {:ok, []}
end
