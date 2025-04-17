defmodule Console.GraphQl.AiQueriesTest do
  use Console.DataCase, async: false
  use Mimic

  describe "aiInsight" do
    test "it can authorize access to an insight" do
      user = insert(:user)
      svc  = insert(:service, read_bindings: [%{user_id: user.id}])
      insight = insert(:ai_insight, service: svc)

      {:ok, %{data: %{"aiInsight" => found}}} = run_query("""
        query Insight($id: ID!) {
          aiInsight(id: $id) {
            id
          }
        }
      """, %{"id" => insight.id}, %{current_user: user})

      assert found["id"] == insight.id

      {:ok, %{errors: [_ | _]}} = run_query("""
        query Insight($id: ID!) {
          aiInsight(id: $id) {
            id
          }
        }
      """, %{"id" => insight.id}, %{current_user: insert(:user)})
    end
  end

  describe "chatThread" do
    test "you can view your own threads" do
      user = insert(:user)
      thread = insert(:chat_thread, user: user)
      chats = insert_list(3, :chat, thread: thread)
      insert_list(4, :chat)

      {:ok, %{data: %{"chatThread" => found}}} = run_query("""
        query Thread($id: ID!) {
          chatThread(id: $id) {
            id
            chats(first: 5) {
              edges { node { id } }
            }
          }
        }
      """, %{"id" => thread.id}, %{current_user: user})

      assert found["id"] == thread.id
      assert from_connection(found["chats"])
             |> ids_equal(chats)
    end

    test "you cannot view other users threads" do
      user = insert(:user)
      thread = insert(:chat_thread)
      insert_list(3, :chat, thread: thread)
      insert_list(5, :chat)

      {:ok, %{errors: [_ | _]}} = run_query("""
        query Thread($id: ID!) {
          chatThread(id: $id) {
            id
            chats(first: 5) {
              edges { node { id } }
            }
          }
        }
      """, %{"id" => thread.id}, %{current_user: user})
    end

    test "it can fetch tools for a thread" do
      user = insert(:user)
      flow = insert(:flow)
      server = insert(:mcp_server, url: "http://localhost:3001", name: "everything")
      insert(:mcp_server_association, server: server, flow: flow)
      thread = insert(:chat_thread, user: user, flow: flow)

      {:ok, %{data: %{"chatThread" => %{"tools" => tools}}}} = run_query("""
        query Thread($id: ID!) {
          chatThread(id: $id) {
            id
            tools {
              server { name }
              tool { name }
            }
          }
        }
      """, %{"id" => thread.id}, %{current_user: user})

      assert Enum.any?(tools, & &1["server"]["name"] == "everything")
      assert Enum.any?(tools, & &1["tool"]["name"] == "echo")
    end
  end

  describe "aiCompletion" do
    test "it can generate an ai summary for the given input" do
      deployment_settings(ai: %{enabled: true, provider: :openai, openai: %{access_token: "secret"}})
      expect(Console.AI.OpenAI, :completion, fn _, _, _ -> {:ok, "openai completion"} end)

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
      expect(Console.AI.OpenAI, :completion, fn _, _, _ -> {:ok, "openai completion"} end)

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
      thread = insert(:chat_thread, user: user, default: true)
      chats = insert_list(3, :chat, user: user, thread: thread)
      insert_list(3, :chat)
      insert_list(3, :chat, user: user)

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

    test "it can fetch by thread id" do
      user = insert(:user)
      thread = insert(:chat_thread, user: user)
      chats = insert_list(3, :chat, user: user, thread: thread)

      {:ok, %{data: %{"chats" => found}}} = run_query("""
        query Chats($thread: ID!) {
          chats(threadId: $thread, first: 5) {
            edges { node { id } }
          }
        }
      """, %{"thread" => thread.id}, %{current_user: user})

      assert from_connection(found)
             |> ids_equal(chats)
    end

    test "it cannot fetch another users thread" do
      user = insert(:user)
      thread = insert(:chat_thread, default: true)
      insert_list(3, :chat, user: user, thread: thread)

      {:ok, %{errors: [_ | _]}} = run_query("""
        query Chats($thread: ID!) {
          chats(threadId: $thread, first: 5) {
            edges { node { id } }
          }
        }
      """, %{"thread" => thread.id}, %{current_user: user})
    end
  end

  describe "clusterInsightComponent" do
    test "it can fetch by id" do
      user = insert(:user)
      cluster = insert(:cluster, read_bindings: [%{user_id: user.id}])
      insight = insert(:ai_insight)
      comp = insert(:cluster_insight_component, insight: insight, cluster: cluster)

      {:ok, %{data: %{"clusterInsightComponent" => found}}} = run_query("""
        query Comp($id: ID!) {
          clusterInsightComponent(id: $id) {
            id
            cluster { id }
            insight { id }
          }
        }
      """, %{"id" => comp.id}, %{current_user: user})

      assert found["id"] == comp.id
      assert found["cluster"]["id"] == comp.cluster_id
      assert found["insight"]["id"] == insight.id
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

  describe "aiPins" do
    test "it can list a users ai pins" do
      user = insert(:user)
      pins = insert_list(3, :ai_pin, user: user)
      insert_list(2, :ai_pin)

      {:ok, %{data: %{"aiPins" => found}}} = run_query("""
        query {
          aiPins(first: 5) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: user})

      assert from_connection(found)
             |> ids_equal(pins)
    end
  end

  describe "aiPin" do
    test "it can fetch by insight id" do
      insight = insert(:ai_insight)
      user = insert(:user)
      pin = insert(:ai_pin, user: user, insight: insight)

      {:ok, %{data: %{"aiPin" => found}}} = run_query("""
        query Pin($id: ID!) {
          aiPin(insightId: $id) {
            id
          }
        }
      """, %{"id" => insight.id}, %{current_user: user})

      assert found["id"] == pin.id
    end

    test "it can fetch by thread id" do
      thread = insert(:chat_thread)
      user = insert(:user)
      pin = insert(:ai_pin, user: user, thread: thread)

      {:ok, %{data: %{"aiPin" => found}}} = run_query("""
        query Pin($id: ID!) {
          aiPin(threadId: $id) {
            id
          }
        }
      """, %{"id" => thread.id}, %{current_user: user})

      assert found["id"] == pin.id
    end
  end

  describe "mcpToken" do
    test "it can generate a jwt that is equivalent to those used by mcp auth" do
      user = insert(:user)
      group = insert(:group)
      insert(:group_member, user: user, group: group)

      {:ok, %{data: %{"mcpToken" => token}}} = run_query("""
        query { mcpToken }
      """, %{}, %{current_user: user})

      {:ok, claims} = Console.Jwt.MCP.exchange(token)

      assert claims["sub"] == user.email
      assert claims["email"] == user.email
      assert claims["name"] == user.name
      assert claims["groups"] == [group.name]
    end
  end
end
