defmodule Console.AI.Evidence.Component.Raw do
  use Console.AI.Evidence.Base
  alias Console.AI.Evidence.Component.Resource

  @kind_blacklist ~w(
    ServiceDeployment
    GlobalService
    GitRepository
    HelmRepository
    Cluster
    InfrastructureStack
    ScmProvider
    PrAutomation
    Catalog
    Project
    NamespaceCredentials
    DeploymentSettings
    OidcProvider
    Pipeline
    Observer
    StackDefinition
    NotificationRouter
    NotificationSink
    ManagedNamespace
    DnsEndpoint
    ClusterIssuer
    Issuer
    ServiceMonitor
    PodMonitor
    PrometheusRule
  ) # ignore crds which we know don't cascade to other resources, mostly our own

  def hydrate(%{"kind" => k, "metadata" => %{"namespace" => ns, "uid" => uid}} = resource)
      when is_binary(ns) and k not in @kind_blacklist do
    Resource.generate(resource)
  end
  def hydrate(_), do: {:ok, []}
end
