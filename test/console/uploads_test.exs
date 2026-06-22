defmodule Console.UploadsTest do
  use ExUnit.Case, async: true

  alias Console.Uploads

  describe "validate/1" do
    test "accepts tar gzip archives" do
      assert :ok = Uploads.validate({%{file_name: "agent-session.tar.gz"}, nil})
    end

    test "accepts json files" do
      assert :ok = Uploads.validate({%{file_name: "agent-session.json"}, nil})
    end

    test "rejects unsupported file types" do
      assert {:error, message} = Uploads.validate({%{file_name: "agent-session.txt"}, nil})
      assert message =~ ".tar.gz"
      assert message =~ ".json"
    end
  end
end
