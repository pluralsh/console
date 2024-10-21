defmodule Console.AI.Evidence.Component.Deployment do
  use Console.AI.Evidence.Base

  def hydrate(%AppsV1.Deployment{metadata: %{namespace: ns}, spec: %{selector: selector}}) do
    list_pods(ns, selector)
    |> default_empty(&pod_messages("deployment", &1))
  end
  def hydrate(_), do: {:ok, []}
end
