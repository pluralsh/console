defmodule Console.AI.Tools.Workbench.ContextTest do
  use ExUnit.Case, async: true

  alias Console.AI.Tools.Workbench.Context
  alias Console.AI.Workbench.Subagents.Base
  alias Console.Schema.WorkbenchJob

  describe "implement/1" do
    test "returns the current objective, time, and workbench URL" do
      job = %WorkbenchJob{
        id: "job-id",
        workbench_id: "workbench-id",
        prompt: "original prompt",
        result: %{objective: "current objective"}
      }

      assert {:ok, encoded} = Context.implement(%Context{job: job})
      assert %{
               "objective" => "current objective",
               "current_time" => current_time,
               "url" => url
             } = Jason.decode!(encoded)

      assert is_binary(current_time)
      assert url =~ "/workbenches/workbench-id/jobs/job-id"
    end
  end

  test "is included in the tools shared by every subagent" do
    job = %WorkbenchJob{id: "job-id", workbench_id: "workbench-id"}

    assert Enum.any?(Base.skill_knowledge_tools(job, %{}), &match?(%Context{job: ^job}, &1))
    assert Enum.any?(Base.skill_knowledge_pre_enable(), &match?(%Context{}, &1))
  end
end
