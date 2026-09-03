defmodule Console.AI.Tools.Workbench.SubagentsTest do
  use Console.DataCase, async: true

  alias Console.AI.Tools.Workbench.Subagents
  alias Console.Schema.{Workbench, WorkbenchJob}

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
