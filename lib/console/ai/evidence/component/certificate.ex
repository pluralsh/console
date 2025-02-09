defmodule Console.AI.Evidence.Component.Certificate do
  use Console.AI.Evidence.Base

  def hydrate(%Kube.Certificate{metadata: %MetaV1.ObjectMeta{namespace: ns, name: n}}) when is_binary(ns) do
    Kube.Client.list_certificate_requests(ns)
    |> default_empty(fn %Kube.CertificateRequest.List{items: requests} ->
      Enum.filter(requests, fn
        %Kube.CertificateRequest{metadata: %MetaV1.ObjectMeta{owner_references: [%{name: ^n} | _]}} -> true
        _ -> false
      end)
      |> Enum.map(& {:user, "the certificate manages a set of certificate requests #{component(&1)} with current state:\n#{encode(&1)}"})
    end)
  end
  def hydrate(_), do: {:ok, []}
end
