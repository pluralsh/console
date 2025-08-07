defmodule Console.AI.Evidence.Component.PersistentVolumeClaim do
  use Console.AI.Evidence.Base
  alias Kazan.Apis.Storage.V1, as: StorageV1
  alias Kazan.Apis.Core.V1, as: CoreV1
  alias Console.Repo
  alias Console.AI.Evidence.Logs
  alias Console.Schema.{Cluster, OperationalLayout}
  alias Console.AI.Evidence.Context

  def hydrate(%CoreV1.PersistentVolumeClaim{} = pvc) do
    pv_message(pvc)
    |> prepend({:user, "the persistent volume claim #{component(pvc)} has a current state of:\n#{json_blob(encode(pvc))}"})
    |> maybe_add_csi_logs(pvc, Repo.preload(get_cluster(), [:operational_layout]))
  end
  def hydrate(_), do: {:ok, []}

  defp pv_message(%CoreV1.PersistentVolumeClaim{spec: %{volume_name: name}}) when is_binary(name) do
    CoreV1.read_persistent_volume!(name)
    |> Kube.Utils.run()
    |> case do
      {:ok, pv} ->
        [
          {:user, "the claim is bound to the persistent volume #{name}, which has a state of:\n#{json_blob(encode(pv))}"}
        ]
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
        csi_ns = resolve_csi_namespace(p, ns)
        append(history, "the storage class #{sc_name} uses the csi provisioner #{p}, I'll list the logs for the csi provisioner #{p} in the #{csi_ns} namespace if available")
        |> Logs.with_logging(
          cluster,
          force: true,
          namespaces: [csi_ns],
          query: p
        )
        |> Context.result()

      _ -> {:ok, history}
    end
  end
  defp maybe_add_csi_logs(history, _, _), do: {:ok, history}


  defp resolve_csi_namespace("ebs.csi.aws.com", %OperationalLayout.Namespaces{ebs_csi_driver: ns})
    when is_binary(ns), do: ns
  defp resolve_csi_namespace(_, _), do: "kube-system"
end
