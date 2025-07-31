defmodule Console.AI.Evidence.Component.PersistentVolumeClaim do
  use Console.AI.Evidence.Base
  alias Kazan.Apis.Storage.V1, as: StorageV1
  alias Kazan.Apis.Core.V1, as: CoreV1
  alias Console.Repo
  alias Console.AI.Evidence.Logs
  alias Console.Schema.{Cluster, OperationalLayout}
  alias Console.AI.Evidence.Context

  def hydrate(%CoreV1.PersistentVolumeClaim{} = pvc) do
    messages = [
      {:user, "the persistent volume claim #{component(pvc)} has a current state of:\n#{json_blob(encode(pvc))}"}
    ] ++ pv_message(pvc)

    messages
    |> maybe_add_csi_logs(pvc, Repo.preload(get_cluster(), [:operational_layout]))
  end
  def hydrate(_), do: {:ok, []}

  defp pv_message(%CoreV1.PersistentVolumeClaim{spec: %{volume_name: name}}) when is_binary(name) do
    with {:ok, pv} <- CoreV1.read_persistent_volume!(name) |> Kube.Utils.run() do
      [
        {:user, "the claim is bound to the persistent volume #{name}, which has a state of:\n#{json_blob(encode(pv))}"}
      ]
    else
      _ -> []
    end
  end
  defp pv_message(_), do: []

  defp maybe_add_csi_logs(history, %CoreV1.PersistentVolumeClaim{spec: %{storage_class_name: sc_name}}, %Cluster{
    operational_layout: %OperationalLayout{namespaces: %OperationalLayout.Namespaces{} = ns}
  } = cluster) when is_binary(sc_name) do
    StorageV1.read_storage_class!(sc_name)
    |> Kube.Utils.run()
    |> case do
      {:ok, %StorageV1.StorageClass{provisioner: p}} ->
        csi_namespace = resolve_csi_namespace(p, ns)
        history = Enum.concat(history, [
          {:user, "the storage class #{sc_name} uses the csi provisioner #{p}"},
          {:user, "analyzing logs for the csi provisioner #{p} in the #{csi_namespace} namespace"}
        ])
        |> Logs.with_logging(
          cluster,
          force: true,
          namespaces: [csi_namespace],
          query: p
        )
        |> Context.history()

        {:ok, history}

      _ -> {:ok, history}
    end
  end
  defp maybe_add_csi_logs(history, _, _), do: {:ok, history}

  defp resolve_csi_namespace(provisioner, %OperationalLayout.Namespaces{} = ns) do
    case csi_namespace_mapping(provisioner, ns) do
      ns when is_binary(ns) -> ns
      _ -> "kube-system"
    end
  end

  defp csi_namespace_mapping("ebs.csi.aws.com", %{ebs_csi_driver: ns}), do: ns
  defp csi_namespace_mapping(_, _), do: nil
end
