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
        files: [
          %{filename: "lib/review.ex", summary: "Defines the provider-neutral schema."},
          %{filename: "lib/a|b.ex", summary: "Handles rows | columns\nwithout breaking tables."}
        ],
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

    assert [%Review.FileSummary{filename: "lib/review.ex"}, %Review.FileSummary{filename: "lib/a|b.ex"}] =
             review.files
    assert [%Review.Comment{line: 10, priority: :p2} = comment] = review.comments

    summary = Review.summary(review)
    assert summary =~ "### Plural Summary"
    assert summary =~ "### Mergeability Grade: B"
    assert summary =~ "<details>"
    assert summary =~ "<summary><strong>Files changed (2)</strong></summary>"

    expected_table =
      """
      | Filename | Summary |
      | --- | --- |
      | `lib/review.ex` | Defines the provider-neutral schema. |
      | `lib/a\\|b.ex` | Handles rows \\| columns<br>without breaking tables. |
      """
      |> String.trim()

    assert summary =~ expected_table
    assert summary =~ "</details>"

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
