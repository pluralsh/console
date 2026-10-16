defmodule Console.AI.Workbench.KnowledgeTest do
  use Console.DataCase, async: false
  use Mimic
  alias Console.AI.Workbench.Subagents.Base
  alias Console.AI.Tools.Workbench.{ListKnowledge, Knowledge, KnowledgeUsed}

  describe "skill_knowledge_tools/2" do
    test "it includes knowledge tools without a workbench filesystem" do
      job = insert(:workbench_job)
      stub(Console.PseudoFS, :enabled?, fn -> false end)

      tools = Base.skill_knowledge_tools(job, %{})
      assert Enum.any?(tools, &match?(%ListKnowledge{}, &1))
      assert Enum.any?(tools, &match?(%Knowledge{}, &1))
      assert Enum.any?(tools, &match?(%KnowledgeUsed{}, &1))
      assert Enum.any?(Base.skill_knowledge_pre_enable(), &match?(%ListKnowledge{}, &1))
    end

    test "the workbench filesystem supersedes the knowledge tools" do
      job = insert(:workbench_job)
      stub(Console.PseudoFS, :enabled?, fn -> true end)

      for tools <- [Base.skill_knowledge_tools(job, %{}), Base.skill_knowledge_pre_enable()] do
        refute Enum.any?(tools, &(is_struct(&1, ListKnowledge) or is_struct(&1, Knowledge) or is_struct(&1, KnowledgeUsed)))
      end
    end
  end

  describe "filesystem knowledge prompt" do
    test "subagent system prompts point at the filesystem and its skill only when it's configured" do
      template = Console.priv_filename(["prompts", "workbench", "observability.md.eex"])
      engine = %{iteration: 0, max_iterations: 100}

      stub(Console.PseudoFS, :enabled?, fn -> true end)
      prompt = EEx.eval_file(template, assigns: [engine: engine])
      assert prompt =~ "default knowledge base"
      assert prompt =~ "Read the `filesystem` skill (via `workbench_skill`)"

      stub(Console.PseudoFS, :enabled?, fn -> false end)
      refute EEx.eval_file(template, assigns: [engine: engine]) =~ "/workbench"
    end
  end
end
