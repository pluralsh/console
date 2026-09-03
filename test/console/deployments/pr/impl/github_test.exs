defmodule Console.Deployments.Pr.Impl.GithubTest do
  use ExUnit.Case, async: true
  use Mimic

  alias Console.Deployments.Pr.Impl.Github
  alias Console.Deployments.Pr.Review
  alias Console.Schema.{PullRequest, ScmConnection}

  test "fetches pull request title, body, and head commit" do
    connection = %ScmConnection{type: :github, token: "token"}

    expect(Tentacat.Pulls, :find, fn _, "pluralsh", "console", "42" ->
      {200,
       %{
         "title" => "Agent review support",
         "body" => "Adds normalized reviews.",
         "head" => %{"sha" => "head-sha"}
       }, nil}
    end)

    assert {:ok,
            %{
              title: "Agent review support",
              body: "Adds normalized reviews.",
              commit_sha: "head-sha"
            }} =
             Github.pr_details(connection, "https://github.com/pluralsh/console/pull/42")
  end

  test "starts a check run with a link to the agent run" do
    connection = %ScmConnection{type: :github, token: "token"}
    pr = %PullRequest{url: "https://github.com/pluralsh/console/pull/42"}

    expect(Tentacat, :post, fn "repos/pluralsh/console/check-runs", _, body ->
      assert body.status == :in_progress
      assert body.head_sha == "head-sha"
      assert body.details_url == "https://console.example.com/ai/agent-runs/run-id"
      assert body.output.summary == "[View agent run](https://console.example.com/ai/agent-runs/run-id)"
      {201, %{"id" => 123}, nil}
    end)

    assert {:ok, "123"} =
             Github.commit_status(connection, pr, nil, :running, %{
               sha: "head-sha",
               url: "https://console.example.com/ai/agent-runs/run-id",
               name: "Plural: Agent review",
               description: "Plural agent review",
               summary: "[View agent run](https://console.example.com/ai/agent-runs/run-id)"
             })
  end

  for {status, conclusion} <- [successful: :success, failed: :failure, cancelled: :cancelled] do
    test "completes a check run as #{status}" do
      status = unquote(status)
      conclusion = unquote(conclusion)
      connection = %ScmConnection{type: :github, token: "token"}
      pr = %PullRequest{url: "https://github.com/pluralsh/console/pull/42"}

      expect(Tentacat, :patch, fn "repos/pluralsh/console/check-runs/123", _, body ->
        assert body.status == :completed
        assert body.conclusion == conclusion
        assert body.completed_at
        {200, %{"id" => 123}, nil}
      end)

      assert {:ok, "123"} =
               Github.commit_status(connection, pr, "123", status, %{
                 sha: "head-sha",
                 url: "https://console.example.com/ai/agent-runs/run-id",
                 name: "Plural: Agent review",
                 description: "Plural agent review"
               })
    end
  end

  test "creates a summary issue comment and inline review comments" do
    connection = %ScmConnection{type: :github, token: "token"}
    pr = %PullRequest{url: "https://github.com/pluralsh/console/pull/42"}

    review =
      Review.new(%{
        url: pr.url,
        confidence: :b,
        summary: "Safe refactor",
        confidence_comment: "One issue should be addressed.",
        comments: [
          %{
            filename: "lib/example.ex",
            line: 12,
            title: "Unhandled error",
            body: "Handle this error.",
            priority: :p1
          },
          %{
            filename: "lib/other.ex",
            line: 20,
            title: "Uncovered branch",
            body: "Cover this branch.",
            priority: :p2
          }
        ]
      })

    expect(Tentacat, :post, fn "repos/pluralsh/console/issues/42/comments", _, body ->
      assert body.body =~ "### Plural Summary"
      assert body.body =~ "### Mergeability Grade: B"
      {201, %{"id" => 10}, nil}
    end)

    expect(Tentacat.Pulls.Reviews, :create, fn _, "pluralsh", "console", "42", body ->
      assert body == %{
               "event" => "COMMENT",
               "comments" => [
                 %{
                   body:
                     ~s(<img src="#{Console.url("/review-priority-p1.svg")}" alt="P1" width="26" height="20" align="absmiddle"> **Unhandled error**\n\nHandle this error.),
                   line: 12,
                   path: "lib/example.ex",
                   side: "RIGHT"
                 },
                 %{
                   body:
                     ~s(<img src="#{Console.url("/review-priority-p2.svg")}" alt="P2" width="26" height="20" align="absmiddle"> **Uncovered branch**\n\nCover this branch.),
                   line: 20,
                   path: "lib/other.ex",
                   side: "RIGHT"
                 }
               ]
             }
      {201, %{"id" => 11}, nil}
    end)

    assert {:ok, "10"} = Github.agent_review(connection, pr, review)
  end

  test "updates the existing summary issue comment" do
    connection = %ScmConnection{type: :github, token: "token"}

    pr = %PullRequest{
      url: "https://github.com/pluralsh/console/pull/42",
      comment_id: "10"
    }

    review =
      Review.new(%{
        url: pr.url,
        confidence: :a,
        summary: "Ready to merge",
        confidence_comment: "No issues found."
      })

    expect(Tentacat, :patch, fn "repos/pluralsh/console/issues/comments/10", _, body ->
      assert body.body =~ "Ready to merge"
      {200, %{"id" => 10}, nil}
    end)

    assert {:ok, "10"} = Github.agent_review(connection, pr, review)
  end
end
