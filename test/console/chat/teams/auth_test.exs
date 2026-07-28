defmodule Console.Chat.Teams.AuthTest do
  use Console.DataCase, async: true
  alias Console.Chat.Teams.Auth

  describe "verify/3" do
    test "rejects a malformed token before any network calls" do
      assert {:error, _} = Auth.verify("not-a-jwt", "some-app-id")
    end

    test "rejects when token or audience are not binaries" do
      assert {:error, _} = Auth.verify(nil, "aud")
      assert {:error, _} = Auth.verify("token", nil)
    end
  end
end
