defmodule Console.Deployments.Deprecations.Checker do
  alias Console.Deployments.Deprecations.Table
  alias Console.Schema.{ServiceComponent, Cluster}

  @doc """
  Determines whether an api has been deprecated, and whether it is blocking upgrade.
  Pass the cluster's `cluster_minor/1` when checking many components against one cluster.
  """
  @spec check(ServiceComponent.t, Cluster.t | Table.minor()) :: {Table.Entry.t, boolean} | :pass
  def check(component, %Cluster{} = cluster), do: check(component, cluster_minor(cluster))
  def check(%ServiceComponent{} = component, minor) do
    with %Table.Entry{} = entry <- Table.fetch(component),
         {true, blocking} <- eligible(minor, entry) do
      {entry, blocking}
    else
      _ -> :pass
    end
  end

  @doc "the {major, minor} kube version a cluster is running, or nil if unknown"
  @spec cluster_minor(Cluster.t) :: Table.minor() | nil
  def cluster_minor(%Cluster{version: vsn, current_version: cvsn}), do: Table.minor(cvsn || vsn)

  @doc """
  Kube apis are compared by minor version: deprecated once the cluster reaches the
  deprecating minor (from the start, when only a removal is recorded), and blocking
  once the next minor removes them.
  """
  def eligible({maj, min} = current, %Table.Entry{component: "k8s", deprecated: deprecated, removed: removed})
      when not (is_nil(deprecated) and is_nil(removed)) do
    {is_nil(deprecated) or current >= deprecated, !is_nil(removed) and {maj, min + 1} >= removed}
  end
  def eligible(_, %Table.Entry{component: "k8s"}), do: :pass
  def eligible(_, _), do: {true, false}
end
