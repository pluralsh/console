defmodule Console.AI.Evidence.Component.PersistentVolumeClaim do
  use Console.AI.Evidence.Base
  alias Kazan.Apis.Storage.V1, as: StorageV1
  alias Kazan.Apis.Core.V1, as: CoreV1

  def hydrate(%CoreV1.PersistentVolumeClaim{} = pvc) do
    messages = [
      {:user, "the statefulset is managing a persistent volume claim #{component(pvc)} which has a current state of:\n#{json_blob(encode(pvc))}"}
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
         {:ok, logs} <- fetch_csi_provisioner_logs(p) do
      [
        {:user, "the storage class #{sc_name} uses the csi provisioner #{p}"},
        {:user, "here are the logs for the csi provisioner #{p} in the kube-system namespace:\n#{logs}"}
      ]
    else
      _ -> []
    end
  end
  defp csi_logs(_), do: []

  defp fetch_csi_provisioner_logs(provisioner) do
    component_name = extract_component_name(provisioner)
    label_patterns = [
      "app.kubernetes.io/name=#{provisioner}",
      "app=#{provisioner}",
      "app.kubernetes.io/component=#{component_name}"
    ]

    Enum.reduce_while(label_patterns, {:error, :not_found}, fn label_selector, _acc ->
      case find_pod_logs(label_selector) do
        {:ok, logs} -> {:halt, {:ok, logs}}
        _ -> {:cont, {:error, :not_found}}
      end
    end)
  end

  defp find_pod_logs(label_selector) do
    with {:ok, %{items: [pod | _]}} <- CoreV1.list_namespaced_pod!("kube-system", label_selector: label_selector) |> Kube.Utils.run(),
         {:ok, logs} <- CoreV1.read_namespaced_pod_log!("kube-system", pod.metadata.name,
                          since_seconds: 1800, tail_lines: 100) |> Kube.Utils.run() do
      {:ok, logs}
    else
      _ -> {:error, :not_found}
    end
  end

  defp extract_component_name(provisioner) do
    provisioner
    |> String.split(".")
    |> List.first()
    |> String.replace("_", "-")
  end
end
