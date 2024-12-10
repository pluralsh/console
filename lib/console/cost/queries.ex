defmodule Console.Cost.Queries do
  import Ecto.Query
  alias Console.Local.{
    PodCpu,
    PodMemory,
    PodCpuRequest,
    PodMemoryRequest,
    PodOwnership
  }

  def cluster_aggregate() do
    from(pc in PodCpu,
      join: pm in PodMemory,
        on: pm.cluster == pc.cluster and pm.pod == pc.pod and pm.namespace == pc.namespace and pm.container == pc.container,
      left_join: pcr in PodCpuRequest,
        on: pc.cluster == pcr.cluster and pcr.pod == pc.pod and pcr.namespace == pc.namespace and pcr.container == pc.container,
      left_join: pmr in PodMemoryRequest,
        on: pc.cluster == pmr.cluster and pmr.pod == pc.pod and pmr.namespace == pc.namespace and pmr.container == pc.container,
      group_by: pc.cluster,
      select: %{
        cluster: pc.cluster,
        memory: type(sum(pmr.memory), :float),
        cpu: type(sum(pcr.cpu), :float),
        cpu_util: type(sum(pc.cpu), :float),
        memory_util: type(sum(pm.memory), :float)
      }
    )
  end

  def namespace_aggregate() do
    from(pc in PodCpu,
      join: pm in PodMemory,
        on: pm.cluster == pc.cluster and pm.pod == pc.pod and pm.namespace == pc.namespace and pm.container == pc.container,
      left_join: pcr in PodCpuRequest,
        on: pc.cluster == pcr.cluster and pcr.pod == pc.pod and pcr.namespace == pc.namespace and pcr.container == pc.container,
      left_join: pmr in PodMemoryRequest,
        on: pc.cluster == pmr.cluster and pmr.pod == pc.pod and pmr.namespace == pc.namespace and pmr.container == pc.container,
      group_by: [pc.cluster, pc.namespace],
      select: %{
        cluster: pc.cluster,
        namespace: pc.namespace,
        memory: type(sum(pmr.memory), :float),
        cpu: type(sum(pcr.cpu), :float),
        cpu_util: type(sum(pc.cpu), :float),
        memory_util: type(sum(pm.memory), :float)
      }
    )
  end

  def recommendations(threshold, cushion) do
    scalar = 1 + (cushion / 100)
    from(pc in PodCpu,
      join: pm in PodMemory,
        on: pm.cluster == pc.cluster and pm.pod == pc.pod and pm.namespace == pc.namespace and pm.container == pc.container,
      left_join: pcr in PodCpuRequest,
        on: pc.cluster == pcr.cluster and pcr.pod == pc.pod and pcr.namespace == pc.namespace and pcr.container == pc.container,
      left_join: pmr in PodMemoryRequest,
        on: pc.cluster == pmr.cluster and pmr.pod == pc.pod and pmr.namespace == pc.namespace and pmr.container == pc.container,
      join: po in PodOwnership,
        on: po.cluster == pc.cluster and po.pod == pc.pod and po.namespace == pc.namespace,
      group_by: [po.cluster, po.type, po.owner, po.namespace, pc.container],
      having: fragment("max((abs(? - coalesce(?, 0)) * 100)/coalesce(?, 1), (abs(? - coalesce(?, 0)) * 100)/coalesce(?, 1)) > ?",
                avg(pc.cpu), avg(pcr.cpu), avg(pcr.cpu), avg(pm.memory), avg(pmr.memory), avg(pmr.memory), ^threshold),
      select: %{
        cluster: po.cluster,
        type: po.type,
        name: po.owner,
        namespace: po.namespace,
        container: pc.container,
        cpu_recommendation: type(avg(pc.cpu) * ^scalar, :float),
        memory_recommendation: type(avg(pm.memory) * ^scalar, :float),
        cpu_request: type(avg(pcr.cpu), :float),
        memory_request: type(avg(pmr.memory), :float)
      }
    )
  end
end
