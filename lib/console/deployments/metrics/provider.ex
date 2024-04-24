defmodule Console.Deployments.Metrics.Provider do
  alias Console.Repo
  alias Console.Schema.{ObservableMetric, ObservabilityProvider}
  alias Console.Deployments.Metrics.Provider.{Datadog}

  @callback query(metric :: ObservableMetric.t) :: :ok | {:error, binary}

  def query(%ObservableMetric{} = metric) do
    metric = Repo.preload(metric, [:provider])
    provider = prov(metric.provider)

    provider.query(metric)
  end

  def prov(%ObservabilityProvider{type: :datadog}), do: Datadog
end
