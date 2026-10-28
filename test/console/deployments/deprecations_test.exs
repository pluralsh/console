defmodule Console.Deployments.DeprecationsTest do
  use ExUnit.Case, async: true
  alias Console.Deployments.Deprecations.{Checker, Table}
  alias Console.Schema.Cluster

  describe "Table.static/0" do
    test "it reads the replacement's availability and parses kube minors once" do
      entries = Table.static()
      deployment = Enum.find(entries, &(&1.group == "extensions" && &1.version == "v1beta1" && &1.kind == "Deployment"))

      assert deployment.available_in == "v1.9.0"
      assert deployment.deprecated == {1, 9}
      assert deployment.removed == {1, 16}
      assert Enum.count(entries, & &1.available_in) > 0
    end

    test "entries without a deprecation version still carry the removal" do
      replicaset = Enum.find(Table.static(), &(&1.group == "extensions" && &1.kind == "ReplicaSet"))

      assert replicaset.deprecated_in == ""
      assert replicaset.deprecated == nil
      assert replicaset.removed == {1, 16}
    end
  end

  describe "Checker.eligible/2" do
    test "it compares kube minors, so provider builds of a minor count as that minor" do
      entry = k8s("v1.25.0", "v1.27.0")

      assert Checker.eligible(minor("1.25.0-eks-5e0fdde"), entry) == {true, false}
      assert Checker.eligible(minor("v1.26.3-gke.1000"), entry) == {true, true}
      assert Checker.eligible(minor("1.24.9"), entry) == {false, false}
      assert Checker.eligible(minor("1.27"), entry) == {true, true}
    end

    test "an api with only a removal version is deprecated until it's removed" do
      entry = k8s("", "v1.16.0")

      assert Checker.eligible({1, 10}, entry) == {true, false}
      assert Checker.eligible({1, 15}, entry) == {true, true}
    end

    test "a missing removal version is deprecated but never blocking" do
      assert Checker.eligible({1, 30}, k8s("v1.29.0", nil)) == {true, false}
    end

    test "unknown versions pass, and non-kube components are always reported" do
      assert Checker.eligible({1, 30}, k8s(nil, nil)) == :pass
      assert Checker.eligible(nil, k8s("v1.25.0", "v1.27.0")) == :pass
      assert Checker.eligible(nil, %Table.Entry{component: "cert-manager"}) == {true, false}
    end

    test "cluster_minor prefers the running version" do
      assert Checker.cluster_minor(%Cluster{version: "1.29", current_version: "1.28.5"}) == {1, 28}
      assert Checker.cluster_minor(%Cluster{version: "1.29"}) == {1, 29}
      assert Checker.cluster_minor(%Cluster{}) == nil
    end
  end

  defp minor(vsn), do: Table.minor(vsn)

  defp k8s(deprecated, removed) do
    %Table.Entry{
      component: "k8s",
      deprecated_in: deprecated,
      removed_in: removed,
      deprecated: Table.minor(deprecated),
      removed: Table.minor(removed)
    }
  end
end
