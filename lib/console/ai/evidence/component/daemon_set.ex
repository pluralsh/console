defmodule Console.AI.Evidence.Component.DaemonSet do
  use Console.AI.Evidence.Base

  def hydrate(%AppsV1.DaemonSet{metadata: %{namespace: ns}, spec: %{selector: selector}}) do
    list_pods(ns, selector)
    |> default_empty(fn %{items: pods} ->
      pod_messages("daemonset", pods)
    end)
  end
  def hydrate(_), do: {:ok, []}
end
