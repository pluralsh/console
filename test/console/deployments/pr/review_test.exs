defmodule Console.Deployments.Pr.ReviewTest do
  use ExUnit.Case, async: true

  alias Console.Deployments.Pr.Review

  test "normalizes nested review attributes and renders the summary" do
    review =
      Review.new(%{
        url: "https://github.com/pluralsh/console/pull/1",
        confidence: :b,
        summary: "Adds normalized agent reviews.",
        confidence_comment: "The implementation is covered by focused tests.",
        files: [%{filename: "lib/review.ex", summary: "Defines the provider-neutral schema."}],
        comments: [
          %{
            filename: "lib/review.ex",
            line: 10,
            title: "Unvalidated input",
            body: "Validate this input.",
            priority: :p2
          }
        ]
      })

    assert [%Review.FileSummary{filename: "lib/review.ex"}] = review.files
    assert [%Review.Comment{line: 10, priority: :p2} = comment] = review.comments

    summary = Review.summary(review)
    assert summary =~ "### Confidence: B"
    assert summary =~ "`lib/review.ex`"

    assert Review.inline_body(comment) ==
             ~s(<img src="#{Console.url("/review-priority-p2.svg")}" alt="P2" width="26" height="20" align="absmiddle"> **Unvalidated input**\n\nValidate this input.)
  end

  test "limits inline comments to three" do
    review =
      Review.new(%{
        comments:
          Enum.map(1..4, fn line ->
            %{
              filename: "lib/review.ex",
              line: line,
              title: "Finding #{line}",
              body: "Finding details",
              priority: :p3
            }
          end)
      })

    assert Enum.map(review.comments, & &1.line) == [1, 2, 3]
  end
end
