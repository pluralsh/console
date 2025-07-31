defmodule Console.AI.Evidence.Component.StatefulSet do
  use Console.AI.Evidence.Base
  alias Console.AI.Evidence.Component.PersistentVolumeClaim
  alias Console.AI.Evidence.Context

  def hydrate(%AppsV1.StatefulSet{metadata: %{namespace: ns}, spec: %{selector: selector}} = sts) do
    with {:ok, pod_evidence} <- list_pods(ns, selector) |> default_empty(&pod_messages("statefulset", &1)) do
      # Start with pod evidence in a Context
      ctx = Context.new(pod_evidence)

      # Merge in PVC evidence (already accumulated in a Context)
      final_ctx = case pvc_messages(sts) do
        %Context{} = pvc_ctx -> Context.merge(ctx, pvc_ctx)
        _ -> ctx
      end

      Context.result(final_ctx)
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
    Enum.reduce(vcts, Context.new([]), fn vct, acc ->
      Enum.reduce(0..(replicas - 1), acc, fn i, acc ->
        case fetch_pvc_evidence(ns, "#{vct.metadata.name}-#{sts_name}-#{i}") do
          {:ok, pvc_ctx} -> Context.merge(acc, pvc_ctx)
          _ -> acc
        end
      end)
    end)
  end

  defp pvc_messages(_), do: Context.new([])

  defp fetch_pvc_evidence(namespace, pvc_name) do
    with {:ok, pvc} <- CoreV1.read_namespaced_persistent_volume_claim!(namespace, pvc_name) |> Kube.Utils.run(),
         {:ok, evidence_messages} <- PersistentVolumeClaim.hydrate(pvc) do

      # Create a Context with both history and evidence
      now = DateTime.utc_now()
      ctx = Context.new(evidence_messages)

      # Add evidence for this specific PVC
      evidence_entry = %{
        type: :log,
        logs: %{
          source: "statefulset-pvc-evidence",
          pvc_name: pvc_name,
          lines: create_evidence_lines(evidence_messages, now)
        }
      }

      ctx_with_evidence = Context.evidence(ctx, evidence_entry)
      {:ok, ctx_with_evidence}
    else
      _ -> {:error, :not_found}
    end
  end

  defp create_evidence_lines(messages, base_timestamp) do
    messages
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
