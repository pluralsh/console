defmodule Console.AI.ChatTest do
  use Console.DataCase, async: false
  alias Console.AI.Chat
  use Mimic

  describe "#rollup/1" do
    test "it can summarize the expired messages in a user chat" do
      deployment_settings(ai: %{enabled: true, provider: :openai, openai: %{access_key: "key"}})

      user = insert(:user)
      old = insert_list(3, :chat, user: user, inserted_at: Timex.now() |> Timex.shift(days: -7))
      keep = insert_list(3, :chat, user: user)
      old_other = insert_list(3, :chat, inserted_at: Timex.now() |> Timex.shift(days: -7))

      expect(Console.AI.OpenAI, :completion, fn _, [_, _, _, _] -> {:ok, "openai completion"} end)

      {:ok, summary} = Chat.rollup(user)

      assert summary.user_id == user.id
      assert summary.content == "openai completion"
      assert summary.seq == -1

      for c <- old,
        do: refute refetch(c)

      for c <- keep ++ old_other,
        do: assert refetch(c)
    end
  end

  describe "#save/2" do
    test "it will save a list of messages for a given user" do
      user = insert(:user)

      {:ok, [first, second]} = Chat.save([
        %{role: :assistant, content: "blah"},
        %{role: :user, content: "blah blah"}
      ], user)

      assert first.content == "blah"
      assert first.user_id == user.id
      assert first.role == :assistant

      assert second.content == "blah blah"
      assert second.user_id == user.id
      assert second.role == :user

      assert first.seq < second.seq
    end
  end

  describe "#chat/2" do
    test "it will persist a set of messages and generate a new one transactionally" do
      user = insert(:user)
      deployment_settings(ai: %{enabled: true, provider: :openai, openai: %{access_key: "key"}})
      expect(Console.AI.OpenAI, :completion, fn _, [_, _, _] -> {:ok, "openai completion"} end)

      {:ok, next} = Chat.chat([
        %{role: :assistant, content: "blah"},
        %{role: :user, content: "blah blah"}
      ], user)

      assert next.user_id == user.id
      assert next.role == :assistant
      assert next.content == "openai completion"
    end
  end
end
