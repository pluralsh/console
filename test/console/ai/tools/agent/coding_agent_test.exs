defmodule Console.AI.Tools.Agent.CodingAgentTest do
  use Console.DataCase, async: true
  alias Console.AI.Tools.Agent.CodingAgent
  alias Console.Schema.AgentRun

  describe "implement/1" do
    test "it can create an agent run" do
      user = insert(:user)
      runtime = insert(:agent_runtime, create_bindings: [%{user_id: user.id}])
      session = insert(:agent_session, runtime: runtime)

      Console.AI.Tool.context(user: user, session: session, thread: session.thread)

      {:ok, result} =
        CodingAgent.implement(%CodingAgent{
          repository: "https://github.com/pluralsh/console.git",
          prompt: "update the readme with a quickstart"
        })

      assert %{type: :agent_run, agent_run_id: run_id, content: content} = result
      assert String.contains?(content, run_id)

      run = Console.Repo.get!(AgentRun, run_id)
      assert run.runtime_id == runtime.id
      assert run.mode == :write
      assert run.session_id == session.id
      assert run.prompt == "update the readme with a quickstart"
      assert run.repository == "https://github.com/pluralsh/console.git"
    end
  end
end
