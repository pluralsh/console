defmodule Console.Deployments.Observability.Utils do
  def post_process(queries), do: Enum.map(queries, fn {k, v} -> {k, to_string(v)} end)

  @units %{cpu: "core", memory: "byte", ephemeral_storage: "byte"}

  @doc """
  Sums kube-state-metrics container requests/limits (`kind` is `:requests` or `:limits`)
  for a single `resource` (`:cpu`, `:memory` or `:ephemeral_storage`).

  The `resource` filter matters because memory and ephemeral storage share `unit="byte"`.

  Each container's series is collapsed with `max` first, since HA kube-state-metrics
  replicas or overlapping scrape jobs export identical series under different
  `instance`/`job` labels, which a bare `sum` would count multiple times.  Grouping
  by a label outside of (namespace, pod, container), eg `node`, keeps it through the dedupe.
  """
  def reservation(kind, resource, selector, by \\ nil)
      when kind in [:requests, :limits] and is_map_key(@units, resource) do
    dedupe = Enum.join(Enum.uniq(~w(namespace pod container) ++ extra_labels(by)), ", ")
    series = ~s|max by (#{dedupe}) (kube_pod_container_resource_#{kind}{resource="#{resource}",unit="#{@units[resource]}",container!="",#{selector}})|
    case by do
      nil -> "sum(#{series})"
      by -> "sum by (#{by}) (#{series})"
    end
  end

  defp extra_labels(by) when by in [nil, ""], do: []
  defp extra_labels(by), do: String.split(by, ~r/\s*,\s*/, trim: true)
end
