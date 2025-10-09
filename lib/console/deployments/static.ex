defmodule Console.Deployments.Static do
  @moduledoc """
  Static values needed to help airgap the deployment.  We ping github for some important data that can
  be embedded at compile time for orgs that do not permit egress there or run fully airgapped.
  """
  alias Console.Deployments

  @compatibilities Deployments.Compatibilities.Table.static()
  @cloud_addons Deployments.Compatibilities.CloudAddOns.static()
  @deprecations Deployments.Deprecations.Table.static()
  @versions Deployments.KubeVersions.Table.static()

  def compatibilities(), do: @compatibilities
  def deprecations(), do: @deprecations
  def cloud_addons(), do: @cloud_addons
  def versions(), do: @versions
end
