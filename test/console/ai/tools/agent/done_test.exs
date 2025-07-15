defmodule Console.AI.Tools.Agent.DoneTest do
  use Console.DataCase, async: true
  alias Console.AI.Tools.Agent.Done

  describe "implement/1" do
    test "it can mark a session as done" do
      user = insert(:user)
      session = insert(:agent_session)
      Console.AI.Tool.context(user: user, session: session, thread: session.thread)

      {:ok, result} = Done.implement(%Done{})

      assert is_binary(result)
      assert refetch(session).done
    end
  end
end
