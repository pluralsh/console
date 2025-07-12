defmodule Console.AI.Tools.Agent.Coding.CommitTest do
  use Console.DataCase, async: false
  use Mimic
  alias Console.AI.Tools.Agent.Coding.Commit

  describe "implement/1" do
    test "it can implement a pr" do
      expect(Console.Deployments.Pr.Git, :clone_branch, fn conn, "https://github.com/pluralsh/console.git", "plrl/ai/pr-test" ->
        {:ok, %{conn | dir: Briefly.create!(directory: true)}}
      end)
      expect(Console.Deployments.Pr.Git, :commit, fn _, _ -> {:ok, ""} end)
      expect(Console.Deployments.Pr.Git, :push, fn _-> {:ok, ""} end)
      expect(File, :write, 2, fn _, _ -> :ok end)

      user = insert(:user)
      git = insert(:git_repository, url: "https://github.com/pluralsh/console.git")
      stack = insert(:stack, repository: git, write_bindings: [%{user_id: user.id}])
      session = insert(:agent_session, stack: stack, branch: "plrl/ai/pr-test")
      Console.AI.Tool.context(user: user, session: session, thread: session.thread)
      insert(:scm_connection, token: "some-pat", default: true)

      {:ok, tool} =
        %Commit{}
        |> Commit.changeset(%{
          repo_url: "https://github.com/pluralsh/console.git",
          commit_message: "a commit",
          file_creates: [%{file_name: "file.yaml", content: "first"}],
          file_updates: [%{file_name: "file2.yaml", previous: "second", replacement: "first"}]
        })
        |> Ecto.Changeset.apply_action(:insert)

      {:ok, pr} = Commit.implement(tool)

      assert is_binary(pr)

      assert refetch(session).commit_count == 1
    end
  end
end
