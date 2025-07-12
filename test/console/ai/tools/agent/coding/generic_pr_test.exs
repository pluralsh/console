defmodule Console.AI.Tools.Agent.Coding.GenericPrTest do
  use Console.DataCase, async: false
  use Mimic
  alias Console.AI.Tools.Agent.Coding.GenericPr

  describe "implement/1" do
    test "it can implement a pr" do
      expect(Tentacat.Pulls, :create, fn _, "pluralsh", "console", %{head: "plrl/ai/pr-test" <> _} ->
        {:ok, %{"html_url" => "https://github.com/pr/url"}, %HTTPoison.Response{}}
      end)
      expect(Console.Deployments.Pr.Git, :setup, fn conn, "https://github.com/pluralsh/console.git", "plrl/ai/pr-test" <> _ ->
        {:ok, %{conn | dir: Briefly.create!(directory: true)}}
      end)
      expect(Console.Deployments.Pr.Git, :commit, fn _, _ -> {:ok, ""} end)
      expect(Console.Deployments.Pr.Git, :push, fn _, "plrl/ai/pr-test" <> _ -> {:ok, ""} end)
      expect(File, :write, 2, fn _, _ -> :ok end)

      user = insert(:user)
      session = insert(:agent_session)
      Console.AI.Tool.context(user: user, session: session, thread: session.thread)
      insert(:scm_connection, token: "some-pat", default: true)

      {:ok, tool} =
        %GenericPr{}
        |> GenericPr.changeset(%{
          repo_url: "https://github.com/pluralsh/console.git",
          branch_name: "pr-test",
          commit_message: "a commit",
          pr_title: "a pr",
          pr_description: "a description",
          file_creates: [%{file_name: "file.yaml", content: "first"}],
          file_updates: [%{file_name: "file2.yaml", previous: "second", replacement: "first"}]
        })
        |> Ecto.Changeset.apply_action(:insert)

      {:ok, pr} = GenericPr.implement(tool)

      assert is_binary(pr)

      %{pull_request: pr} = Console.Repo.preload(refetch(session), [:pull_request])

      assert pr.url == "https://github.com/pr/url"

      assert_receive {:event, %Console.PubSub.PullRequestCreated{}}
    end
  end
end
