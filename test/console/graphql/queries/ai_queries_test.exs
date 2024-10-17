defmodule Console.GraphQl.AiQueriesTest do
  use Console.DataCase, async: true
  use Mimic

  describe "aiCompletion" do
    test "it can generate an ai summary for the given input" do
      deployment_settings(ai: %{enabled: true, provider: :openai, openai: %{access_token: "secret"}})
      expect(Console.AI.OpenAI, :completion, fn _, _ -> {:ok, "openai completion"} end)

      {:ok, %{data: %{"aiCompletion" => summary}}} = run_query("""
        query Summary($input: String!, $system: String!) {
          aiCompletion(input: $input, system: $system)
        }
      """, %{"input" => "blah", "system" => "blah"}, %{current_user: insert(:user)})

      assert summary == "openai completion"
    end
  end
end
