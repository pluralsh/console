defmodule Console.AI.Tools.Workbench.SubagentsTest do
  use Console.DataCase, async: true

  alias Console.AI.Tools.Workbench.{
    ObservabilityResult,
    Result,
    Subagent,
    Subagents
  }
  alias Console.Schema.{Workbench, WorkbenchJob}

  describe "subagent prompt guidance" do
    test "requires a descriptive first line without generic labels" do
      tool = %Subagent{subagents: [:coding]}
      prompt_description =
        get_in(Subagent.json_schema(tool), ["properties", "prompt", "description"])

      assert Subagent.description(tool) =~ "first line"
      assert prompt_description =~ "first line"
      assert prompt_description =~ ~s("Task")
      assert prompt_description =~ ~s("Job")
    end
  end

  describe "subagent result guidance" do
    test "requires conclusions to describe the completed work on the first line" do
      for tool <- [Result, ObservabilityResult] do
        output_description =
          get_in(tool.json_schema(), ["properties", "output", "description"])

        assert tool.description() =~ "first line"
        assert output_description =~ "first line"
        assert output_description =~ "work completed"
      end
    end
  end

  describe "implement/1" do
    test "mentions review mode on the coding subagent only when enabled" do
      {:ok, encoded} =
        Subagents.implement(%Subagents{
          bench: %Workbench{},
          job: %WorkbenchJob{},
          subagents: [:coding],
          categories: []
        })

      %{"name" => "coding", "description" => disabled} = Jason.decode!(encoded) |> List.first()
      refute disabled =~ "Review mode is enabled"

      {:ok, encoded} =
        Subagents.implement(%Subagents{
          bench: %Workbench{},
          job: %WorkbenchJob{
            modes: %WorkbenchJob.Modes{coding: %WorkbenchJob.Modes.Coding{review: true}}
          },
          subagents: [:coding],
          categories: []
        })

      %{"name" => "coding", "description" => enabled} = Jason.decode!(encoded) |> List.first()
      assert enabled =~ "Review mode is enabled for this job"
      assert enabled =~ "review mode"
    end
  end
end
