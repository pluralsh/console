defmodule Console.Deployments.Static do
  @moduledoc """
  Static values needed to help airgap the deployment.  We ping github for some important data that can
  be embedded at compile time for orgs that do not permit egress there or run fully airgapped.
  """
  alias Console.Deployments.{Compatibilities, Deprecations, KubeVersions}

  @compatibilities Compatibilities.Table.static()
  @cloud_addons Compatibilities.CloudAddOns.static()
  @deprecations Deprecations.Table.static()
  @versions KubeVersions.Table.static()
  @changelog KubeVersions.Table.static_changelog()

  def compatibilities(), do: @compatibilities
  def deprecations(), do: @deprecations
  def cloud_addons(), do: @cloud_addons
  def versions(), do: @versions
  def changelog(), do: @changelog

  def __mix_recompile__?() do
    @compatibilities != Compatibilities.Table.static() or
    @cloud_addons != Compatibilities.CloudAddOns.static() or
    @deprecations != Deprecations.Table.static() or
    @versions != KubeVersions.Table.static() or
    @changelog != KubeVersions.Table.static_changelog()
  end
end
