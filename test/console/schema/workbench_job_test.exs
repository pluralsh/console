defmodule Console.Schema.WorkbenchJobTest do
  use ExUnit.Case, async: true

  alias Console.Schema.WorkbenchJob.Mini

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
