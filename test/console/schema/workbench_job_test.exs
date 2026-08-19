defmodule Console.Schema.WorkbenchJobTest do
  use ExUnit.Case, async: true

  alias Console.Schema.WorkbenchJob.Mini
  alias Console.Schema.{WorkbenchJob, WorkbenchJobActivity, WorkbenchJobResult, WorkbenchJobThought}

  describe "objective/1" do
    test "uses the recorded objective when present" do
      job = %WorkbenchJob{
        prompt: "investigate the original alert",
        result: %WorkbenchJobResult{objective: "investigate the new deployment failure"}
      }

      assert WorkbenchJob.objective(job) == "investigate the new deployment failure"
    end

    test "falls back to the original prompt" do
      assert WorkbenchJob.objective(%WorkbenchJob{prompt: "investigate the original alert"}) ==
               "investigate the original alert"
    end
  end

  describe "Mini.normalize_status/1" do
    test "accepts enum atoms" do
      assert Mini.normalize_status(:successful) == :successful
      assert Mini.normalize_status(:pending) == :pending
    end

    test "accepts lowercase string values from vector store decode" do
      assert Mini.normalize_status("successful") == :successful
      assert Mini.normalize_status("pending") == :pending
    end

    test "returns nil for values that cannot be cast" do
      assert Mini.normalize_status("SUCCESSFUL") == nil
      assert Mini.normalize_status("invalid") == nil
      assert Mini.normalize_status(nil) == nil
    end
  end

  describe "text sanitization" do
    test "sanitizes job prompts and errors" do
      job =
        WorkbenchJob.changeset(%WorkbenchJob{}, %{
          prompt: "prompt" <> <<0>>,
          error: <<0xC3, 0x28>>
        })
        |> Ecto.Changeset.apply_changes()

      assert job.prompt == "prompt"
      assert job.error == "�("
    end

    test "removes NUL bytes and replaces malformed UTF-8 from activity responses and tool calls" do
      invalid = <<0xC3, 0x28>>

      activity =
        WorkbenchJobActivity.changeset(%WorkbenchJobActivity{}, %{
          status: :successful,
          type: :function,
          prompt: "call" <> <<0>>,
          result: %{output: "response" <> <<0>> <> invalid},
          tool_call: %{
            call_id: "call" <> <<0>>,
            name: "tool" <> invalid,
            arguments: %{"key" <> <<0>> => "value" <> invalid}
          }
        })
        |> Ecto.Changeset.apply_changes()

      assert activity.prompt == "call"
      assert activity.result.output == "response�("
      assert activity.tool_call.call_id == "call"
      assert activity.tool_call.name == "tool�("
      assert activity.tool_call.arguments == %{"key" => "value�("}
    end

    test "sanitizes persisted job results and thoughts recursively" do
      result =
        WorkbenchJobResult.changeset(%WorkbenchJobResult{}, %{
          objective: "investigate" <> <<0>>,
          metadata: %{
            logs: [%{message: <<0xC3, 0x28>>, labels: %{"source" <> <<0>> => "api" <> <<0>>}}]
          }
        })
        |> Ecto.Changeset.apply_changes()

      thought =
        WorkbenchJobThought.changeset(%WorkbenchJobThought{}, %{
          content: "thought" <> <<0>>,
          tool_name: "tool" <> <<0>>,
          tool_args: %{"input" <> <<0>> => <<0xC3, 0x28>>}
        })
        |> Ecto.Changeset.apply_changes()

      assert result.objective == "investigate"
      assert [%{message: "�(", labels: %{"source" => "api"}}] = result.metadata.logs
      assert thought.content == "thought"
      assert thought.tool_name == "tool"
      assert thought.tool_args == %{"input" => "�("}
    end
  end
end
