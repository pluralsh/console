defmodule Console.AI.Evidence.Component.StatefulSet do
  use Console.AI.Evidence.Base
  alias Console.AI.Evidence.Component.PersistentVolumeClaim
  alias Console.AI.Evidence.Context

  def hydrate(%AppsV1.StatefulSet{metadata: %{namespace: ns}, spec: %{selector: selector}} = sts) do
    with {:ok, pod_evidence} <- list_pods(ns, selector) |> default_empty(&pod_messages("statefulset", &1)) do
      pvc_evidence = pvc_messages(sts)
      all_observations = pod_evidence ++ pvc_evidence

      now = DateTime.utc_now()
      evidence = [%{
        type: :log,
        logs: %{
          source: "statefulset-evidence",
          lines: extract_evidence_lines(all_observations, now)
        }
      }]

      history(all_observations, %{evidence: evidence})
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
    result_ctx = Enum.reduce(vcts, Context.new([]), fn vct, acc ->
      Enum.reduce(0..(replicas - 1), acc, fn i, acc ->
        case fetch_pvc_evidence(ns, "#{vct.metadata.name}-#{sts_name}-#{i}") do
          {:ok, data} -> Context.merge(acc, data)
          _ -> acc
        end
      end)
    end)

    result_ctx.history
  end

  defp pvc_messages(_), do: []

  defp fetch_pvc_evidence(namespace, pvc_name) do
    with {:ok, pvc} <- CoreV1.read_namespaced_persistent_volume_claim!(namespace, pvc_name) |> Kube.Utils.run(),
         {:ok, evidence_messages} <- PersistentVolumeClaim.hydrate(pvc) do
      {:ok, evidence_messages}
    else
      _ -> {:error, :not_found}
    end
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
