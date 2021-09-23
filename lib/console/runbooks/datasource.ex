defprotocol Console.Runbooks.Datasource do
  @spec fetch(struct, Kube.Runbook.t) :: {:ok | :error, any}
  def fetch(struct, struct)
end

defmodule Console.Runbooks.Data do
  alias Console.Runbooks.Datasource, as: DataImpl
  alias Kube.Runbook.{Datasource, Prometheus, Kubernetes}

  def extract(%Datasource{name: name} = datasource, runbook) do
    {key, data} = inputs(datasource)

    case DataImpl.fetch(data, runbook) do
      {:ok, res} -> %{key => res, name: name, source: datasource}
      _ -> nil
    end
  end

  def inputs(%Datasource{type: "nodes"}), do: {:nodes, :nodes}
  def inputs(%Datasource{prometheus: %Prometheus{} = prom}),
    do: {:prometheus, prom}
  def inputs(%Datasource{kubernetes: %Kubernetes{} = kube}),
    do: {:kubernetes, kube}
end

defimpl Console.Runbooks.Datasource, for: Atom do
  alias Kazan.Apis.Core.V1

  def fetch(:nodes, _) do
    V1.list_node!()
    |> Kazan.run()
    |> case do
      {:ok, %{items: items}} -> {:ok, items}
      error -> error
    end
  end
end

defimpl Console.Runbooks.Datasource, for: Kube.Runbook.Prometheus do
  alias Console.Services.Observability

  def fetch(%{query: query}, _) do
    now   = Timex.now()
    start = Timex.shift(now, seconds: -30 * 60)
    Observability.get_metric(query, start, now, "1m")
  end
end

defimpl Console.Runbooks.Datasource, for: Kube.Runbook.Kubernetes do
  alias Kazan.Apis.Apps.V1, as: AppsV1

  def fetch(%{resource: "statefulset", name: name}, %{metadata: %{namespace: namespace}}) do
    AppsV1.read_namespaced_stateful_set!(namespace, name)
    |> Kazan.run()
  end

  def fetch(%{resource: "deployment", name: name}, %{metadata: %{namespace: namespace}}) do
    AppsV1.read_namespaced_deployment!(namespace, name)
    |> Kazan.run()
  end
end
