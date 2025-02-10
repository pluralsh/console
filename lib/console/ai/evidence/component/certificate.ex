defmodule Console.AI.Evidence.Component.Certificate do
  use Console.AI.Evidence.Base
  alias Console.Repo
  alias Console.AI.Evidence.Logs
  alias Console.AI.Evidence.Context
  alias Console.Schema.{Cluster, OperationalLayout}

  def hydrate(%Kube.Certificate{metadata: %MetaV1.ObjectMeta{namespace: ns, name: n}}) when is_binary(ns) do
    Kube.Client.list_certificate_requests(ns)
    |> default_empty(fn %Kube.CertificateRequest.List{items: requests} ->
      Enum.filter(requests, fn
        %Kube.CertificateRequest{metadata: %MetaV1.ObjectMeta{owner_references: [%{name: ^n} | _]}} -> true
        _ -> false
      end)
      |> Enum.map(& {:user, "the certificate manages a set of certificate requests #{component(&1)} with current state:\n#{encode(&1)}"})
    end)
    |> case do
      {:ok, history} -> history
      _ -> []
    end
    |> maybe_add_logs(Repo.preload(get_cluster(), [:operational_layout]))
  end
  def hydrate(_), do: {:ok, []}

  defp maybe_add_logs(history, %Cluster{
    operational_layout: %OperationalLayout{namespaces: %OperationalLayout.Namespaces{
      cert_manager: cm,
      external_dns: ed
    }
  }} = cluster) when is_binary(cm) do
    Logs.with_logging(history, cluster, force: true, namespaces: [cm | (ed || [])])
    |> Context.result()
  end
  defp maybe_add_logs(history, _), do: {:ok, history}
end
