defmodule Console.AI.FixerTest do
  use Console.DataCase, async: false
  use Mimic
  alias Console.AI.Fixer

  describe "#pr/2" do
    test "it can spawn a fix pr" do
      insert(:scm_connection, token: "some-pat", default: true)
      expect(Tentacat.Pulls, :create, fn _, "pluralsh", "console", %{head: "plrl/ai/pr-test" <> _} ->
        {:ok, %{"html_url" => "https://github.com/pr/url"}, %HTTPoison.Response{}}
      end)
      expect(Console.Deployments.Pr.Git, :setup, fn conn, "https://github.com/pluralsh/console.git", "plrl/ai/pr-test" <> _ ->
        {:ok, %{conn | dir: Briefly.create!(directory: true)}}
      end)
      expect(Console.Deployments.Pr.Git, :commit, fn _, _ -> {:ok, ""} end)
      expect(Console.Deployments.Pr.Git, :push, fn _, "plrl/ai/pr-test" <> _ -> {:ok, ""} end)
      expect(File, :write, fn _, "first" -> :ok end)
      expect(File, :write, fn _, "second" -> :ok end)
      expect(HTTPoison, :post, fn _, _, _, _ ->
        {:ok, %HTTPoison.Response{status_code: 200, body: Jason.encode!(%{choices: [
            %{
              message: %{
                tool_calls: [%{
                  function: %{
                    name: "create_pr",
                    arguments: Jason.encode!(%{
                      repo_url: "git@github.com:pluralsh/console.git",
                      branch_name: "pr-test",
                      pr_description: "some pr",
                      pr_title: "some pr",
                      commit_message: "a commit",
                      file_updates: [
                        %{
                          file_name: "file.yaml",
                          replacement: "first",
                          previous: "second"
                        },
                        %{
                          file_name: "file2.yaml",
                          replacement: "second",
                          previous: "first"
                        }
                      ]
                    })
                  }
              }]
            }
          }
        ]})}}
      end)

      user = insert(:user)
      git = insert(:git_repository, url: "https://github.com/pluralsh/deployment-operator.git")
      parent = insert(:service,
        repository: git,
        git: %{ref: "main", folder: "charts/deployment-operator"}
      )

      svc = insert(:service,
        repository: git,
        git: %{ref: "main", folder: "charts/deployment-operator"},
        write_bindings: [%{user_id: user.id}],
        parent: parent
      )
      insight = insert(:ai_insight, service: svc)

      deployment_settings(ai: %{enabled: true, provider: :openai, openai: %{access_token: "secret"}})

      {:ok, pr} = Fixer.pr(insight.id, [], user)

      assert pr.url == "https://github.com/pr/url"
    end
  end
end
