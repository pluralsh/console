defmodule Console.AI.Evidence.Component.StatefulSet do
  use Console.AI.Evidence.Base
  alias Console.AI.Evidence.Component.PersistentVolumeClaim
  alias Console.AI.Evidence.Context

  def hydrate(%AppsV1.StatefulSet{metadata: %{namespace: ns}, spec: %{selector: selector}} = sts) do
    list_pods(ns, selector)
    |> default_empty(&pod_messages("statefulset", &1))
    |> case do
      {:ok, pod_evidence} ->
        Context.new(pod_evidence)
        |> maybe_merge_pvcs(pvc_messages(sts))
        |> Context.result()
      _ -> {:ok, []}
    end
  end

  def hydrate(_), do: {:ok, []}

  # we should only care about pvc evidence if there are actually failed pvcs
  defp maybe_merge_pvcs(ctx, %Context{history: [_ | _]} = pvc_ctx) do
    pvc_ctx = Context.prompt(pvc_ctx, "this statefulset also has failing pvcs, which i'll describe in the next few messages")
    Context.merge(ctx, pvc_ctx)
  end
  defp maybe_merge_pvcs(ctx, _), do: ctx

  defp pvc_messages(%AppsV1.StatefulSet{
    metadata: %{name: sts_name, namespace: ns},
    spec: %{replicas: replicas, volume_claim_templates: vcts}
  }) when is_list(vcts) do
    Enum.reduce(vcts, Context.new([]), fn vct, acc ->
      Enum.reduce(0..(replicas - 1), acc, fn i, acc ->
        case fetch_pvc_evidence(ns, "#{vct.metadata.name}-#{sts_name}-#{i}") do
          {:ok, pvc_ctx} -> Context.merge(acc, pvc_ctx)
          _ -> acc
        end
      end)
    end)
  end
  defp pvc_messages(_), do: :ignore

  defp fetch_pvc_evidence(namespace, pvc_name) do
    CoreV1.read_namespaced_persistent_volume_claim!(namespace, pvc_name)
    |> Kube.Utils.run()
    |> case do
      {:ok, %CoreV1.PersistentVolumeClaim{status: %CoreV1.PersistentVolumeClaimStatus{phase: p}} = pvc}
          when p != "Bound" ->
        PersistentVolumeClaim.hydrate(pvc)
        |> Context.from_result()
      _ -> :ignore
    end
  end
end
