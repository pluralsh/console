defmodule Console.Users.AccessTokensTest do
  use Console.DataCase, async: true
  alias Console.Users.AccessTokens

  describe "#scopes_match/3" do
    test "it will match if api and id matches" do
      scope = build(:scope, identifier: "id", api: "updateService")
      assert AccessTokens.scopes_match?([scope], "updateService", "id")
      refute AccessTokens.scopes_match?([scope], "updateCluster", "id")
      refute AccessTokens.scopes_match?([scope], "updateService", "id2")
    end

    test "it will match if api and id in list" do
      scope = build(:scope, ids: ["id"], apis: ["updateService"])
      assert AccessTokens.scopes_match?([scope], "updateService", "id")
      refute AccessTokens.scopes_match?([scope], "updateCluster", "id")
      refute AccessTokens.scopes_match?([scope], "updateService", "id2")
    end

    test "it will match by wildcard" do
      scope = build(:scope, ids: ["*"], apis: ["updateService"])
      assert AccessTokens.scopes_match?([scope], "updateService", "id")
      refute AccessTokens.scopes_match?([scope], "updateCluster", "id")
      assert AccessTokens.scopes_match?([scope], "updateService", "id2")

      scope = build(:scope, identifier: "*", apis: ["updateService"])
      assert AccessTokens.scopes_match?([scope], "updateService", "id")
      refute AccessTokens.scopes_match?([scope], "updateCluster", "id")
      assert AccessTokens.scopes_match?([scope], "updateService", "id2")
    end

    test "it will ignore nils" do
      scope = build(:scope)
      assert AccessTokens.scopes_match?([scope], "updateService", "id")
      assert AccessTokens.scopes_match?([scope], "updateCluster", "id")
      assert AccessTokens.scopes_match?([scope], "updateService", "id2")
    end
  end
end
