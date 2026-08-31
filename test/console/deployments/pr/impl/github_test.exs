defmodule Console.Deployments.Pr.Impl.GithubTest do
  use ExUnit.Case, async: true
  use Mimic

  alias Console.Deployments.Pr.Impl.Github
  alias Console.Deployments.Pr.Review
  alias Console.Schema.{PullRequest, ScmConnection}

  test "fetches pull request title and body" do
    connection = %ScmConnection{type: :github, token: "token"}

    expect(Tentacat.Pulls, :find, fn _, "pluralsh", "console", "42" ->
      {200, %{"title" => "Agent review support", "body" => "Adds normalized reviews."}, nil}
    end)

    assert {:ok, %{title: "Agent review support", body: "Adds normalized reviews."}} =
             Github.pr_details(connection, "https://github.com/pluralsh/console/pull/42")
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
      assert body.body =~ "### Grade: B"
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
