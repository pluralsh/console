defmodule Console.Deployments.PolicyTest do
  use Console.DataCase, async: true
  alias Console.Deployments.Policy
  alias Console.Schema.PolicyConstraint

  describe "#upsert_constraints/2" do
    test "it can add constraints to the db for a cluster" do
      cluster = insert(:cluster)

      {:ok, 3} = Policy.upsert_constraints([
        %{
          name: "some-constraint",
          ref: %{kind: "K8sSomePolicy", name: "some-constraint"},
          violation_count: 0,
          violations: []
        },
        %{
          name: "other-constraint",
          ref: %{kind: "K8sSomePolicy", name: "other-constraint"},
          violation_count: 1,
          violations: [%{group: "apps", version: "v1", kind: "Deployment", namespace: "prod", name: "service", message: "this is bad"}]
        }
      ], cluster)

      constraints = PolicyConstraint.for_cluster(cluster.id)
                    |> Repo.all()
                    |> Repo.preload([:violations])

      assert length(constraints) == 2
      by_name = Map.new(constraints, & {&1.name, &1})

      assert length(by_name["other-constraint"].violations) == 1
      assert length(by_name["some-constraint"].violations) == 0
    end

    test "it can prune no longer used constraints" do
      cluster = insert(:cluster)
      keep = insert(:policy_constraint, cluster: cluster, name: "some-constraint")
      ignore = insert(:policy_constraint, cluster: cluster, name: "other-constraint")

      {:ok, _} = Policy.upsert_constraints([
        %{
          name: "some-constraint",
          ref: %{kind: "K8sSomePolicy", name: "some-constraint"},
          violation_count: 0,
          violations: []
        },
      ], cluster)

      refute refetch(ignore)
      keep = refetch(keep)
      assert keep.ref.kind == "K8sSomePolicy"
      assert keep.ref.name == "some-constraint"
    end
  end
end
