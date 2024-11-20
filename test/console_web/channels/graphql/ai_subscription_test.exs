defmodule ConsoleWeb.GraphQl.AISubscriptionTest do
  use ConsoleWeb.ChannelCase, async: false
  alias Console.AI.Stream

  describe "aiStream" do
    test "build create will broadcast deltas" do
      user = insert(:user)
      thread = insert(:chat_thread)
      {:ok, socket} = establish_socket(user)

      ref = push_doc(socket, """
        subscription AI($threadId: ID) {
          aiStream(threadId: $threadId) { content }
        }
      """, variables: %{"threadId" => thread.id})

      assert_reply(ref, :ok, %{subscriptionId: _})

      stream = %Stream{topic: Stream.topic(:thread, thread.id, user)}
      Stream.publish(stream, "something")
      assert_push("subscription:data", %{result: %{data: %{"aiStream" => %{"content" => "something"}}}})
    end
  end
end
