defmodule Console.Deployments.BootstrapPoliciesTest do
  use Console.DataCase, async: true
  alias Console.Deployments.BootstrapPolicies

  setup :setup_bootstrap_token

  describe "#can?/3" do
    test "a bootstrap token can view its project", %{token: token, user: user} do
      assert BootstrapPolicies.can?(user, token.project, :read) == :pass
      refute BootstrapPolicies.can?(user, token.project, :write) == :pass
      refute BootstrapPolicies.can?(user, insert(:project), :read) == :pass
    end

    test "a bootstrap token can create clusters in its project", %{token: token, user: user} do
      assert BootstrapPolicies.can?(user, insert(:cluster, project: token.project), :create) == :pass
      assert BootstrapPolicies.can?(user, insert(:cluster, project: token.project), :token) == :pass
      assert BootstrapPolicies.can?(user, insert(:cluster, project: token.project), :read) == :pass
      refute BootstrapPolicies.can?(user, insert(:cluster, project: token.project), :write) == :pass
    end

    test "a bootstrap token cannot create services in its project", %{token: token, user: user} do
      cluster = insert(:cluster, project: token.project)
      refute BootstrapPolicies.can?(user, insert(:service, cluster: cluster), :create) == :pass
    end
  end

  defp setup_bootstrap_token(_) do
    token = insert(:bootstrap_token)
    [token: token, user: %{token.user | bootstrap: token}]
  end
end
