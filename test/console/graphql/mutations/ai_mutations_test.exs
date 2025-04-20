defmodule Console.GraphQl.AIMutationsTest do
  use Console.DataCase, async: true
  use Mimic

  describe "saveChats" do
    test "saves a set of messages to a users chat history" do
      {:ok, %{data: %{"saveChats" => [first, second]}}} = run_query("""
        mutation Save($messages: [ChatMessage]) {
          saveChats(messages: $messages) {
            content
          }
        }
      """, %{"messages" => [
        %{"role" => "ASSISTANT", "content" => "blah"},
        %{"role" => "USER", "content" => "blah blah"}
      ]}, %{current_user: insert(:user)})

      assert first["content"] == "blah"
      assert second["content"] == "blah blah"
    end
  end

  describe "chat" do
    test "it will transactionally generate a new chat completion" do
      user = insert(:user)
      deployment_settings(ai: %{enabled: true, provider: :openai, openai: %{access_token: "key"}})
      expect(Console.AI.OpenAI, :completion, fn _, [_, _, _], _ -> {:ok, "openai completion"} end)

      {:ok, %{data: %{"chat" => response}}} = run_query("""
        mutation Chat($messages: [ChatMessage]) {
          chat(messages: $messages) {
            id
            role
            content
            thread { id }
          }
        }
      """, %{"messages" => [
        %{"role" => "ASSISTANT", "content" => "blah"},
        %{"role" => "USER", "content" => "blah blah"}
      ]}, %{current_user: user})

      assert response["role"] == "ASSISTANT"
      assert response["content"] == "openai completion"
      assert response["thread"]["id"]
    end
  end

  describe "clearChatHistory" do
    test "it can wipe your chat history blank" do
      user = insert(:user)
      thread = insert(:chat_thread, user: user, default: true)
      chats = insert_list(3, :chat, user: user, thread: thread)
      ignore = insert_list(3, :chat)
      ignore2 = insert_list(3, :chat, user: user)

      {:ok, %{data: %{"clearChatHistory" => 3}}} = run_query("""
        mutation {
          clearChatHistory
        }
      """, %{}, %{current_user: user})

      for c <- chats,
        do: refute refetch(c)

      for c <- ignore ++ ignore2,
        do: assert refetch(c)
    end

    test "it will clear chats before a sequence number" do
      user = insert(:user)
      thread = insert(:chat_thread, user: user, default: true)
      chats = insert_list(3, :chat, user: user, seq: 1, thread: thread)
      ignore1 = insert_list(3, :chat, user: user, seq: 3)
      ignore2 = insert_list(3, :chat)

      {:ok, %{data: %{"clearChatHistory" => 3}}} = run_query("""
        mutation {
          clearChatHistory(before: 2)
        }
      """, %{}, %{current_user: user})

      for c <- chats,
        do: refute refetch(c)

      for c <- ignore1 ++ ignore2,
        do: assert refetch(c)
    end
  end

  describe "createThread" do
    test "it can create a thread for a user" do
      user = insert(:user)
      {:ok, %{data: %{"createThread" => thread}}} = run_query("""
        mutation Create($attrs: ChatThreadAttributes!) {
          createThread(attributes: $attrs) {
            id
            summary
          }
        }
      """, %{"attrs" => %{
        "summary" => "a thread",
        "messages" => [%{"role" => "ASSISTANT", "content" => "blah"}]
      }}, %{current_user: user})

      assert thread["id"]
      assert thread["summary"] == "a thread"

      {:ok, %{data: %{"chats" => chat}}} = run_query("""
        query Chat($id: ID!) {
          chats(threadId: $id, first: 5) {
            edges { node { id content role } }
          }
        }
      """, %{"id" => thread["id"]}, %{current_user: user})

      [%{"role" => "ASSISTANT", "content" => "blah"}] = from_connection(chat)
    end
  end

  describe "updateThread" do
    test "it can update a thread for a user" do
      user = insert(:user)
      thread = insert(:chat_thread, user: user)

      {:ok, %{data: %{"updateThread" => upd}}} = run_query("""
        mutation Create($id: ID!, $attrs: ChatThreadAttributes!) {
          updateThread(id: $id, attributes: $attrs) {
            id
            summary
          }
        }
      """, %{
        "id" => thread.id,
        "attrs" => %{"summary" => "a thread"}
      }, %{current_user: user})

      assert upd["id"] == thread.id
      assert upd["summary"] == "a thread"
    end
  end

  describe "deleteThread" do
    test "it can delete a thread for a user" do
      user = insert(:user)
      thread = insert(:chat_thread, user: user)

      {:ok, %{data: %{"deleteThread" => del}}} = run_query("""
        mutation Create($id: ID!) {
          deleteThread(id: $id) {
            id
          }
        }
      """, %{"id" => thread.id}, %{current_user: user})

      assert del["id"] == thread.id
      refute refetch(thread)
    end
  end

  describe "deleteChat" do
    test "it can delete a chat message from a users history" do
      user = insert(:user)
      chat = insert(:chat, user: user)

      {:ok, %{data: %{"deleteChat" => del}}} = run_query("""
        mutation Delete($id: ID!) {
          deleteChat(id: $id) { id }
        }
      """, %{"id" => chat.id}, %{current_user: user})

      assert del["id"] == chat.id

      refute refetch(chat)
    end

    test "it fails if you aren't the owner of the msg" do
      user = insert(:user)
      chat = insert(:chat)

      {:ok, %{errors: [_ | _]}} = run_query("""
        mutation Delete($id: ID!) {
          deleteChat(id: $id) { id }
        }
      """, %{"id" => chat.id}, %{current_user: user})
    end
  end

  describe "createPin" do
    test "it can create a pin" do
      user = insert(:user)
      insight = insert(:ai_insight)

      {:ok, %{data: %{"createPin" => pin}}} = run_query("""
        mutation Create($attributes: AiPinAttributes!) {
          createPin(attributes: $attributes) {
            id
            insight { id }
          }
        }
      """, %{"attributes" => %{"insightId" => insight.id}}, %{current_user: user})

      assert pin["id"]
      assert pin["insight"]["id"] == insight.id
    end
  end

  describe "deletePin" do
    test "it can create a pin" do
      user = insert(:user)
      pin = insert(:ai_pin, user: user)

      {:ok, %{data: %{"deletePin" => del}}} = run_query("""
        mutation Create($id: ID!) {
          deletePin(id: $id) {
            id
            insight { id }
          }
        }
      """, %{"id" => pin.id}, %{current_user: user})

      assert del["id"] == pin.id
      refute refetch(pin)
    end
  end

  describe "cloneThread" do
    test "it can clone a thread" do
      user = insert(:user)
      thread = insert(:chat_thread, user: user, flow: insert(:flow))
      insert(:chat, user: user, thread: thread)

      {:ok, %{data: %{"cloneThread" => clone}}} = run_query("""
        mutation Clone($id: ID!) {
          cloneThread(id: $id) {
            id
            summary
            user { id }
            flow { id }
          }
        }
      """, %{"id" => thread.id}, %{current_user: user})

      assert clone["id"]
      assert clone["summary"] == "Clone of #{thread.summary}"
      assert clone["user"]["id"] == user.id
      assert clone["flow"]["id"] == thread.flow_id
    end
  end
end
