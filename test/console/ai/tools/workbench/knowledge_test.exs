defmodule Console.AI.Tools.Workbench.KnowledgeTest do
  use Console.DataCase, async: true

  alias Console.AI.Tool
  alias Console.AI.Tools.Workbench.{ListKnowledge, Knowledge, KnowledgeUsed, KnowledgeUpsert, KnowledgeDelete}
  alias Console.AI.Workbench.Subagents.Base, as: SubagentBase

  describe "ListKnowledge.implement/1" do
    test "lists knowledge for the job workbench with usage data" do
      workbench = insert(:workbench)
      job = insert(:workbench_job, workbench: workbench)
      k1 = insert(:workbench_knowledge, workbench: workbench, name: "runbook", description: "ops", usages: 3, labels: ["ops"])
      insert(:workbench_knowledge, name: "other-bench")

      {:ok, json} = ListKnowledge.implement(%ListKnowledge{job: job})
      {:ok, listed} = Jason.decode(json)

      assert length(listed) == 1
      [entry] = listed
      assert entry["id"] == k1.id
      assert entry["name"] == "runbook"
      assert entry["description"] == "ops"
      assert entry["labels"] == ["ops"]
      assert entry["usages"] == 3
      refute Map.has_key?(entry, "knowledge")
    end
  end

  describe "Knowledge.implement/1" do
    test "returns full knowledge contents and records a usage" do
      workbench = insert(:workbench)
      job = insert(:workbench_job, workbench: workbench)
      knowledge = insert(:workbench_knowledge,
        workbench: workbench,
        name: "runbook",
        knowledge: "restart the pod",
        usages: 1
      )

      {:ok, parsed} = Tool.validate(%Knowledge{job: job}, %{"name" => "runbook"})
      {:ok, json} = Knowledge.implement(parsed)
      {:ok, body} = Jason.decode(json)

      assert body["id"] == knowledge.id
      assert body["name"] == "runbook"
      assert body["knowledge"] == "restart the pod"
      assert body["usages"] == 2
      assert body["last_used_at"]
      assert refetch(knowledge).usages == 2
    end

    test "returns an error when the name is missing" do
      workbench = insert(:workbench)
      job = insert(:workbench_job, workbench: workbench)

      {:ok, parsed} = Tool.validate(%Knowledge{job: job}, %{"name" => "missing"})
      {:error, "knowledge not found"} = Knowledge.implement(parsed)
    end
  end

  describe "KnowledgeUsed.implement/1" do
    test "records usage for a knowledge entry by name" do
      workbench = insert(:workbench)
      job = insert(:workbench_job, workbench: workbench)
      knowledge = insert(:workbench_knowledge, workbench: workbench, name: "runbook", usages: 1)

      {:ok, parsed} = Tool.validate(%KnowledgeUsed{job: job}, %{"name" => "runbook"})
      {:ok, json} = KnowledgeUsed.implement(parsed)
      {:ok, body} = Jason.decode(json)

      assert body["id"] == knowledge.id
      assert body["name"] == "runbook"
      assert body["usages"] == 2
      assert body["last_used_at"]
      assert refetch(knowledge).usages == 2
    end

    test "returns an error when the name is missing" do
      job = insert(:workbench_job)

      {:ok, parsed} = Tool.validate(%KnowledgeUsed{job: job}, %{"name" => "missing"})
      {:error, "knowledge not found"} = KnowledgeUsed.implement(parsed)
    end
  end

  describe "skill_knowledge_tools/2" do
    test "includes read-only skill and knowledge tools plus usage recording" do
      job = insert(:workbench_job)
      names = SubagentBase.skill_knowledge_tools(job, %{})
              |> Enum.map(&Tool.name/1)

      assert "workbench_skills" in names
      assert "workbench_skill" in names
      assert "workbench_list_knowledge" in names
      assert "workbench_knowledge" in names
      assert "workbench_knowledge_used" in names
      refute "workbench_knowledge_upsert" in names
      refute "workbench_knowledge_delete" in names
    end
  end

  describe "KnowledgeUpsert.implement/1" do
    test "creates a knowledge entry" do
      workbench = insert(:workbench)
      job = insert(:workbench_job, workbench: workbench)

      {:ok, parsed} = Tool.validate(%KnowledgeUpsert{job: job}, %{
        "name" => "runbook",
        "description" => "ops notes",
        "knowledge" => "restart the pod",
        "labels" => ["ops"]
      })
      {:ok, json} = KnowledgeUpsert.implement(parsed)
      {:ok, body} = Jason.decode(json)

      assert body["name"] == "runbook"
      assert body["knowledge"] == "restart the pod"
      assert body["labels"] == ["ops"]
    end

    test "updates an existing knowledge entry by name" do
      workbench = insert(:workbench)
      job = insert(:workbench_job, workbench: workbench)
      existing = insert(:workbench_knowledge, workbench: workbench, name: "runbook", knowledge: "old")

      {:ok, parsed} = Tool.validate(%KnowledgeUpsert{job: job}, %{
        "name" => "runbook",
        "knowledge" => "new body"
      })
      {:ok, json} = KnowledgeUpsert.implement(parsed)
      {:ok, body} = Jason.decode(json)

      assert body["id"] == existing.id
      assert body["knowledge"] == "new body"
    end

    test "fails to create when the workbench already has 10 entries" do
      workbench = insert(:workbench)
      job = insert(:workbench_job, workbench: workbench)
      for i <- 1..10, do: insert(:workbench_knowledge, workbench: workbench, name: "k-#{i}")

      {:ok, parsed} = Tool.validate(%KnowledgeUpsert{job: job}, %{
        "name" => "overflow",
        "knowledge" => "too many"
      })
      {:error, error} = KnowledgeUpsert.implement(parsed)
      assert error =~ "10 knowledge entries"
    end
  end

  describe "KnowledgeDelete.implement/1" do
    test "deletes a knowledge entry by id on the job's workbench" do
      workbench = insert(:workbench)
      job = insert(:workbench_job, workbench: workbench)
      knowledge = insert(:workbench_knowledge, workbench: workbench, name: "stale")

      {:ok, parsed} = Tool.validate(%KnowledgeDelete{job: job}, %{"knowledge_id" => knowledge.id})
      {:ok, msg} = KnowledgeDelete.implement(parsed)

      assert msg =~ knowledge.id
      assert msg =~ "stale"
      refute refetch(knowledge)
    end

    test "does not delete knowledge from another workbench" do
      job = insert(:workbench_job)
      knowledge = insert(:workbench_knowledge, name: "stale")

      {:ok, parsed} = Tool.validate(%KnowledgeDelete{job: job}, %{"knowledge_id" => knowledge.id})
      {:error, "knowledge not found"} = KnowledgeDelete.implement(parsed)

      assert refetch(knowledge)
    end
  end
end
