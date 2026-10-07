defmodule Console.AI.Tools.PlanSummaryTest do
  use Console.DataCase, async: true
  alias Console.AI.Tools.PlanSummary

  describe "implement/1" do
    test "it renders a plan summary as markdown" do
      {:ok, md} = PlanSummary.implement(%PlanSummary{
        summary: "Adds a new node group",
        blast_radius: "Only the new node group is created",
        critical_systems: ["kube-system"],
        notable_changes: ["create aws_eks_node_group.workers"],
        safety: "Safe to apply after reviewing IAM changes"
      })

      assert md =~ "## Summary"
      assert md =~ "Adds a new node group"
      assert md =~ "## Blast Radius"
      assert md =~ "* kube-system"
      assert md =~ "* create aws_eks_node_group.workers"
      assert md =~ "## Safety Assessment"
      assert md =~ "Safe to apply after reviewing IAM changes"
    end

    test "it omits empty list sections" do
      {:ok, md} = PlanSummary.implement(%PlanSummary{
        summary: "No-op plan",
        blast_radius: "None",
        critical_systems: [],
        notable_changes: [],
        safety: "Safe to apply"
      })

      refute md =~ "## Critical Systems"
      refute md =~ "## Notable Changes"
      assert md =~ "## Safety Assessment"
    end
  end
end
