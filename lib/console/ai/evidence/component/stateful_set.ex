defmodule Console.AI.Evidence.Component.StatefulSet do
  use Console.AI.Evidence.Base

  def hydrate(%AppsV1.StatefulSet{metadata: %{namespace: ns}, spec: %{selector: selector}}) do
    list_pods(ns, selector)
    |> default_empty(fn %{items: pods} ->
      pod_messages("statefulset", pods)
    end)
  end
  def hydrate(_), do: {:ok, []}
end
