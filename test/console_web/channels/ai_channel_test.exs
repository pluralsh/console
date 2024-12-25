defmodule ConsoleWeb.AIChannelTest do
  use ConsoleWeb.ChannelCase, async: false
  alias Console.AI.Stream

  describe "AIChannel" do
    test "it can broadcast ai stream events" do
      insight = insert(:ai_insight)
      user = insert(:user)
      topic = Stream.topic(:insight, insight.id, user)

      {:ok, socket} = mk_socket(user)
      {:ok, _, _socket} = subscribe_and_join(socket, topic, %{})

      stream = %Stream{topic: topic}
      Stream.publish(stream, "ai content", 0)
      assert_push "stream", %{content: "ai content", seq: 0}
    end
  end
end
