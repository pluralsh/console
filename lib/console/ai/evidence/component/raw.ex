defmodule Console.AI.Evidence.Component.Raw do
  use Console.AI.Evidence.Base

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

  def hydrate(%{"kind" => k, "metadata" => %{"namespace" => ns}} = _resource)
      when is_binary(ns) and k not in @kind_blacklist, do: {:ok, []} # ignore for now, not sure what we can really do
  def hydrate(_), do: {:ok, []}
end
