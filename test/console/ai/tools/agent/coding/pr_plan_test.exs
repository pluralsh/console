defmodule Console.AI.Tools.Agent.Coding.PrPlanTest do
  use Console.DataCase, async: true
  alias Console.AI.Tools.Agent.Coding.PrPlan

  describe "implement/1" do
    test "it can record a plan" do
      actor = admin_user()
      session = insert(:agent_session)
      Console.AI.Tool.context(user: actor, session: session, thread: session.thread)

      {:ok, msg} = PrPlan.implement(%PrPlan{plan: "a plan", repo_url: "https://github.com/pluralsh/console.git"})

      assert is_binary(msg)
      assert refetch(session).plan_confirmed
    end
  end
end
