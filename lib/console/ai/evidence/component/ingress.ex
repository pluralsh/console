defmodule Console.AI.Evidence.Component.Ingress do
  use Console.AI.Evidence.Base

  def hydrate(%NetworkingV1.Ingress{metadata: %{namespace: ns}, spec: %{tls: [_ | _] = tls}}) do
    names = MapSet.new(tls, & &1.secret_name)
    Kube.Client.list_certificate(ns)
    |> default_empty(fn %{items: certs} ->
      Enum.filter(certs, &MapSet.member?(names, &1.metadata.name))
      |> Enum.map(& {:user, "the ingress has a certificate #{component(&1)}, its specification is:\n#{encode(&1)}"})
      |> prepend({:user, "this ingress has a few certificates managed by cert-manager, I'll list them out for you"})
    end)
    |> default_empty(&add_logging/1)
  end
  def hydrate(_), do: {:ok, add_logging([])}

  defp add_logging(msgs), do: msgs ++ [{:user, "it can also be helpful to look at the logs for the ingress controller"}]
end
