defmodule Console.Schema.WorkbenchJobThoughtTest do
  use Console.DataCase, async: true

  alias Console.Schema.WorkbenchJobThought

  test "persists the originating tool call" do
    activity = insert(:workbench_job_activity)

    assert {:ok, %WorkbenchJobThought{} = thought} =
             %WorkbenchJobThought{}
             |> WorkbenchJobThought.changeset(%{
               activity_id: activity.id,
               content: "tool result",
               tool_call: %{
                 call_id: "call-1",
                 name: "example",
                 arguments: %{"query" => "up"}
               }
             })
             |> Repo.insert()

    assert thought.tool_call.call_id == "call-1"
    assert thought.tool_call.name == "example"
    assert thought.tool_call.arguments == %{"query" => "up"}
  end
end
