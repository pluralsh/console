defmodule Console.GraphQl.AiQueriesTest do
  use Console.DataCase, async: false
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

  describe "aiSuggestedFix" do
    test "it can generate a suggestion for a fix given an existing insight" do
      user = insert(:user)
      git = insert(:git_repository, url: "https://github.com/pluralsh/deployment-operator.git")
      parent = insert(:service,
        repository: git,
        git: %{ref: "main", folder: "charts/deployment-operator"}
      )

      svc = insert(:service,
        repository: git,
        git: %{ref: "main", folder: "charts/deployment-operator"},
        write_bindings: [%{user_id: user.id}],
        parent: parent
      )
      insight = insert(:ai_insight, service: svc)

      deployment_settings(ai: %{enabled: true, provider: :openai, openai: %{access_token: "secret"}})
      expect(Console.AI.OpenAI, :completion, fn _, _ -> {:ok, "openai completion"} end)

      {:ok, %{data: %{"aiSuggestedFix" => result}}} = run_query("""
        query Suggestion($insightId: ID!) {
          aiSuggestedFix(insightId: $insightId)
        }
      """, %{"insightId" => insight.id}, %{current_user: user})

      assert result == "openai completion"
    end

    test "it will reject if a user shouldn't have access to this insight" do
      git = insert(:git_repository, url: "https://github.com/pluralsh/deployment-operator.git")
      svc = insert(:service,
        repository: git,
        git: %{ref: "main", folder: "charts/deployment-operator"}
      )
      insight = insert(:ai_insight, service: svc)

      deployment_settings(ai: %{enabled: true, provider: :openai, openai: %{access_token: "secret"}})

      {:ok, %{errors: [_ | _]}} = run_query("""
        query Suggestion($insightId: ID!) {
          aiSuggestedFix(insightId: $insightId)
        }
      """, %{"insightId" => insight.id}, %{current_user: insert(:user)})
    end
  end

  describe "chats" do
    test "it will fetch a users chat history" do
      user = insert(:user)
      chats = insert_list(3, :chat, user: user)
      insert_list(3, :chat)

      {:ok, %{data: %{"chats" => found}}} = run_query("""
        query {
          chats(first: 5) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: user})

      assert from_connection(found)
             |> ids_equal(chats)
    end
  end

  describe "clusterInsightComponent" do
    test "it can fetch by id" do
      user = insert(:user)
      cluster = insert(:cluster, read_bindings: [%{user_id: user.id}])
      comp = insert(:cluster_insight_component, cluster: cluster)

      {:ok, %{data: %{"clusterInsightComponent" => found}}} = run_query("""
        query Comp($id: ID!) {
          clusterInsightComponent(id: $id) { id }
        }
      """, %{"id" => comp.id}, %{current_user: user})

      assert found["id"] == comp.id
    end

    test "it cannot fetch w/o access" do
      user = insert(:user)
      cluster = insert(:cluster)
      comp = insert(:cluster_insight_component, cluster: cluster)

      {:ok, %{errors: [_ | _]}} = run_query("""
        query Comp($id: ID!) {
          clusterInsightComponent(id: $id) { id }
        }
      """, %{"id" => comp.id}, %{current_user: user})
    end
  end
end
