defmodule Console.AI.Evidence.Component.PersistentVolumeClaim do
  use Console.AI.Evidence.Base
  alias Kazan.Apis.Storage.V1, as: StorageV1
  alias Kazan.Apis.Core.V1, as: CoreV1
  alias Console.Logs.{Provider, Query}
  alias Console.Repo
  alias Console.Schema.{Cluster, OperationalLayout}

  def hydrate(%CoreV1.PersistentVolumeClaim{} = pvc) do
    messages = [
      {:user, "the persistent volume claim #{component(pvc)} has a current state of:\n#{json_blob(encode(pvc))}"}
    ] ++ pv_message(pvc) ++ csi_logs(pvc)
    {:ok, messages}
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

  defp csi_logs(%CoreV1.PersistentVolumeClaim{spec: %{storage_class_name: sc_name}}) do
    with {:ok, %StorageV1.StorageClass{provisioner: p}} <- StorageV1.read_storage_class!(sc_name) |> Kube.Utils.run(),
         {:ok, logs, namespace} <- find_logs_via_driver(p) do
      [
        {:user, "the storage class #{sc_name} uses the csi provisioner #{p}"},
        {:user, "here are the logs for the csi provisioner #{p} in the #{namespace} namespace:"}
      ] ++ Enum.map(logs, &{:user, &1})
    else
      _ -> []
    end
  end
  defp csi_logs(_), do: []

  defp find_logs_via_driver(provisioner) do
    cluster = get_cluster() |> Repo.preload([:operational_layout])
    namespace = resolve_csi_namespace(provisioner, cluster)

    query = Query.new([
      cluster_id: cluster.id,
      namespaces: [namespace],
      query: provisioner,
      limit: 100,
      time: [duration: "30m"]
    ])

    with {:ok, query} <- {:ok, %{query | resource: cluster}},
         {:ok, log_lines} <- Provider.query(query) do
      # Format the logs similar to the original format
      logs = log_lines
             |> Enum.take(100)  # Equivalent to tail_lines: 100
             |> Enum.map(& &1.log)

      {:ok, logs, namespace}
    else
      {:error, _} -> {:error, :not_found}
      _ -> {:error, :not_found}
    end
  end

  # Resolve CSI driver namespace based on operational layout configuration
  defp resolve_csi_namespace(provisioner, %Cluster{
    operational_layout: %OperationalLayout{namespaces: %OperationalLayout.Namespaces{} = ns}
  }) do
    get_csi_namespace(provisioner, ns)
  end

  # Fallback when operational_layout is not configured
  defp resolve_csi_namespace(_, _), do: "kube-system"

  defp get_csi_namespace(provisioner, namespaces) do
    case csi_namespace_mapping(provisioner, namespaces) do
      ns when is_binary(ns) -> ns
      _ -> "kube-system"
    end
  end

  defp csi_namespace_mapping("ebs.csi.aws.com", %{ebs_csi_driver: ns}), do: ns
  # Future CSI drivers could be added here:
  # defp csi_namespace_mapping("disk.csi.azure.com", %{azure_disk_csi: ns}), do: ns
  # defp csi_namespace_mapping("pd.csi.storage.gke.io", %{gke_persistent_disk_csi: ns}), do: ns
  defp csi_namespace_mapping(_, _), do: nil
end
