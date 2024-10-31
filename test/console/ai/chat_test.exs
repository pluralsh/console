defmodule Console.AI.ChatTest do
  use Console.DataCase, async: true
  alias Console.AI.Chat
  use Mimic

  describe "#create_thread/2" do
    test "users can create new chat threads" do
      user = insert(:user)

      {:ok, thread} = Chat.create_thread(%{summary: "a thread"}, user)

      assert thread.summary == "a thread"
      refute thread.default
      assert thread.user_id == user.id
    end
  end

  describe "#update_thread/2" do
    test "users can update their thread" do
      user = insert(:user)
      thread = insert(:chat_thread, user: user)

      {:ok, update} = Chat.update_thread(%{summary: "update"}, thread.id, user)

      assert update.id == thread.id
      assert update.summary == "update"
    end

    test "users cannot update other users threads" do
      user = insert(:user)
      thread = insert(:chat_thread)

      {:error, _} = Chat.update_thread(%{summary: "udpate"}, thread.id, user)
    end
  end

  describe "#delete_thread/2" do
    test "users can delete their thread" do
      user = insert(:user)
      thread = insert(:chat_thread, user: user)

      {:ok, delete} = Chat.delete_thread(thread.id, user)

      assert delete.id == thread.id
      refute refetch(delete)
    end

    test "users cannot delete other users threads" do
      user = insert(:user)
      thread = insert(:chat_thread)

      {:error, _} = Chat.delete_thread(thread.id, user)
    end
  end

  describe "#rollup/1" do
    test "it can summarize the expired messages in a user chat" do
      deployment_settings(ai: %{enabled: true, provider: :openai, openai: %{access_token: "key"}})

      user = insert(:user)
      thread = insert(:chat_thread, user: user)
      old = insert_list(3, :chat, thread: thread, user: user, inserted_at: Timex.now() |> Timex.shift(days: -7))
      keep = insert_list(3, :chat, thread: thread, user: user)
      old_other = insert_list(3, :chat, inserted_at: Timex.now() |> Timex.shift(days: -7))
      old_other2 = insert_list(3, :chat, user: user, inserted_at: Timex.now() |> Timex.shift(days: -7))

      expect(Console.AI.OpenAI, :completion, fn _, [_, _, _, _, _] -> {:ok, "openai completion"} end)

      {:ok, summary} = Chat.rollup(thread)

      assert summary.user_id == user.id
      assert summary.content == "openai completion"
      assert summary.seq == -1
      assert summary.thread_id == thread.id

      for c <- old,
        do: refute refetch(c)

      for c <- keep ++ old_other ++ old_other2,
        do: assert refetch(c)
    end
  end

  describe "#summarize/1" do
    test "it can summarize the contents of a thread" do
      thread = insert(:chat_thread)
      insert_list(3, :chat, thread: thread)
      insert_list(3, :chat)
      deployment_settings(ai: %{enabled: true, provider: :openai, openai: %{access_token: "key"}})

      expect(Console.AI.OpenAI, :completion, fn _, [_, _, _, _, _] -> {:ok, "ai thread summary"} end)

      {:ok, summarized} = Chat.summarize(thread)

      assert summarized.id == thread.id
      assert summarized.summary == "ai thread summary"
      assert summarized.summarized
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

    test "it will save a list of messages for a given user in a thread" do
      user = insert(:user)
      thread = insert(:chat_thread, user: user)

      {:ok, [first, second]} = Chat.save([
        %{role: :assistant, content: "blah"},
        %{role: :user, content: "blah blah"}
      ], thread.id, user)

      assert first.content == "blah"
      assert first.user_id == user.id
      assert first.role == :assistant

      assert second.content == "blah blah"
      assert second.user_id == user.id
      assert second.role == :user

      assert first.seq < second.seq

      assert Enum.all?([first, second], & &1.thread_id == thread.id)
    end

    test "you cannot save messages in another users thread" do
      user = insert(:user)
      thread = insert(:chat_thread)

      {:error, _} = Chat.save([
        %{role: :assistant, content: "blah"},
        %{role: :user, content: "blah blah"}
      ], thread.id, user)
    end
  end

  describe "#chat/2" do
    test "it will persist a set of messages and generate a new one transactionally in whatever thread" do
      user = insert(:user)
      deployment_settings(ai: %{enabled: true, provider: :openai, openai: %{access_token: "key"}})
      expect(Console.AI.OpenAI, :completion, 2, fn _, [_, _, _] -> {:ok, "openai completion"} end)

      {:ok, next} = Chat.chat([
        %{role: :assistant, content: "blah"},
        %{role: :user, content: "blah blah"}
      ], user)

      assert next.user_id == user.id
      assert next.role == :assistant
      assert next.content == "openai completion"

      thread = insert(:chat_thread, user: user)

      {:ok, next} = Chat.chat([
        %{role: :assistant, content: "blah"},
        %{role: :user, content: "blah blah"}
      ], thread.id, user)

      assert next.thread_id == thread.id
      assert next.user_id == user.id
      assert next.role == :assistant
      assert next.content == "openai completion"
    end

    test "it will persist a set of messages and generate a new one transactionally in a thread" do
      user = insert(:user)
      thread = insert(:chat_thread, user: user)
      deployment_settings(ai: %{enabled: true, provider: :openai, openai: %{access_token: "key"}})
      expect(Console.AI.OpenAI, :completion, fn _, [_, _, _] -> {:ok, "openai completion"} end)

      {:ok, next} = Chat.chat([
        %{role: :assistant, content: "blah"},
        %{role: :user, content: "blah blah"}
      ], thread.id, user)

      assert next.user_id == user.id
      assert next.thread_id == thread.id
      assert next.role == :assistant
      assert next.content == "openai completion"
    end

    test "you cannot chat in another users thread" do
      user = insert(:user)
      thread = insert(:chat_thread)
      deployment_settings(ai: %{enabled: true, provider: :openai, openai: %{access_token: "key"}})

      {:error, _} = Chat.chat([
        %{role: :assistant, content: "blah"},
        %{role: :user, content: "blah blah"}
      ], thread.id, user)
    end
  end

  describe "#make_default_thread/1" do
    test "only one default thread can be created" do
      user = insert(:user)

      thread = Chat.make_default_thread!(user)

      assert thread.user_id == user.id
      assert thread.default

      {:error, _} = Chat.create_thread(%{default: true, summary: "blah"}, user)
    end
  end

  describe "#create_pin/2" do
    test "a user can pin an insight" do
      user = insert(:user)
      insight = insert(:ai_insight)

      {:ok, pin} = Chat.create_pin(%{insight_id: insight.id}, user)

      assert pin.user_id == user.id
      assert pin.insight_id == insight.id
    end
  end

  describe "#delete_pin/2" do
    test "a user can delete their pin" do
      user = insert(:user)
      pin = insert(:ai_pin, user: user)

      {:ok, del} = Chat.delete_pin(pin.id, user)

      assert del.id == pin.id
      refute refetch(pin)
    end

    test "users cannot delete others' pins" do
      {:error, _} = Chat.delete_pin(insert(:ai_pin).id, insert(:user))
    end
  end
end
