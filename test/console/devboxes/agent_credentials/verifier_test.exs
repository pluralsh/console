defmodule Console.Devboxes.AgentCredentials.Verifier.HttpTest do
  use ExUnit.Case, async: true
  use Mimic
  alias Console.Devboxes.AgentCredentials.Verifier.Http

  describe "codex auth.json bundles" do
    test "they are verified with the bundle's access token, not the whole bundle" do
      bundle = Jason.encode!(%{"tokens" => %{"access_token" => "at-123", "refresh_token" => "rt", "account_id" => "acc"}})
      expect(Req, :get, fn _, opts ->
        assert {"authorization", "Bearer at-123"} in opts[:headers]
        assert {"chatgpt-account-id", "acc"} in opts[:headers]
        {:ok, %Req.Response{status: 200, body: %{"email" => "me@example.com", "plan_type" => "pro"}}}
      end)

      {:ok, %{"email" => "me@example.com", "plan" => "pro"}} = Http.verify(:codex_chatgpt_auth, bundle, %{"account_id" => "acc"})
    end

    test "bundles without an access token are rejected without calling the vendor" do
      reject(Req, :get, 2)

      {:error, _} = Http.verify(:codex_chatgpt_auth, Jason.encode!(%{"tokens" => %{}}), %{})
      {:error, _} = Http.verify(:codex_chatgpt_auth, "not json", %{})
    end
  end
end
