defmodule Console.AI.Evidence.Component.StatefulSet do
  use Console.AI.Evidence.Base
  alias Console.AI.Evidence.Component.PersistentVolumeClaim

  def hydrate(%AppsV1.StatefulSet{metadata: %{namespace: ns}, spec: %{selector: selector}} = sts) do
    with {:ok, pod_evidence} <- list_pods(ns, selector) |> default_empty(&pod_messages("statefulset", &1)),
         pvc_evidence <- pvc_messages(sts) do
      evidence(pod_evidence ++ pvc_evidence)
    else
      _ -> {:ok, []}
    end
  end

  def hydrate(_), do: {:ok, []}

  defp pvc_messages(%AppsV1.StatefulSet{
         metadata: %{name: sts_name, namespace: ns},
         spec: %{replicas: replicas, volume_claim_templates: vcts}
       })
       when is_list(vcts) do
    vcts
    |> Enum.flat_map(fn vct ->
      0..(replicas - 1)
      |> Enum.flat_map(fn i ->
        pvc_name = "#{vct.metadata.name}-#{sts_name}-#{i}"

        with {:ok, pvc} <- CoreV1.read_namespaced_persistent_volume_claim!(ns, pvc_name) |> Kube.Utils.run(),
             {:ok, evidence} <- PersistentVolumeClaim.hydrate(pvc) do
          evidence
        else
          _ -> []
        end
      end)
    end)
  end

  defp pvc_messages(_), do: []

  defp evidence(observations) when is_list(observations) do
    now = DateTime.utc_now()

    evidence = [%{
      type: :log,
      logs: %{
        source: "statefulset-evidence",
        lines: extract_evidence_lines(observations, now)
      }
    }]

    history(observations, %{evidence: evidence})
  end

  defp extract_evidence_lines(evidence, base_timestamp) when is_list(evidence) do
    evidence
    |> Enum.with_index()
    |> Enum.map(fn {entry, index} ->
      log_message = case entry do
        {_, msg} -> msg
        msg when is_binary(msg) -> msg
      end

      %{
        timestamp: DateTime.add(base_timestamp, index, :second),
        log: log_message
      }
    end)
  end
end
