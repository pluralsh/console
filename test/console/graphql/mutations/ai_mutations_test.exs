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
      deployment_settings(ai: %{enabled: true, provider: :openai, openai: %{access_key: "key"}})
      expect(Console.AI.OpenAI, :completion, fn _, [_, _, _] -> {:ok, "openai completion"} end)

      {:ok, %{data: %{"chat" => response}}} = run_query("""
        mutation Chat($messages: [ChatMessage]) {
          chat(messages: $messages) {
            id
            role
            content
          }
        }
      """, %{"messages" => [
        %{"role" => "ASSISTANT", "content" => "blah"},
        %{"role" => "USER", "content" => "blah blah"}
      ]}, %{current_user: user})

      assert response["role"] == "ASSISTANT"
      assert response["content"] == "openai completion"
    end
  end

  describe "clearChatHistory" do
    test "it can wipe your chat history blank" do
      user = insert(:user)
      chats = insert_list(3, :chat, user: user)
      ignore = insert_list(3, :chat)

      {:ok, %{data: %{"clearChatHistory" => 3}}} = run_query("""
        mutation {
          clearChatHistory
        }
      """, %{}, %{current_user: user})

      for c <- chats,
        do: refute refetch(c)

      for c <- ignore,
        do: assert refetch(c)
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
end
