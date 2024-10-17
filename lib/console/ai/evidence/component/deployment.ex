defmodule Console.AI.Evidence.Component.Deployment do
  use Console.AI.Evidence.Base

  def hydrate(%AppsV1.Deployment{metadata: %{namespace: ns}, spec: %{selector: selector}}) do
    list_pods(ns, selector)
    |> default_empty(fn %{items: pods} ->
      pod_messages("deployment", pods)
    end)
  end
  def hydrate(_), do: {:ok, []}
end
