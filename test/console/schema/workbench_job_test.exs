defmodule Console.Schema.WorkbenchJobTest do
  use ExUnit.Case, async: true

  alias Console.Schema.WorkbenchJob.Mini
  alias Console.Schema.{WorkbenchJob, WorkbenchJobResult}

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
end
