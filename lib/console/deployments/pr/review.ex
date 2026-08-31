defmodule Console.Deployments.Pr.Review do
  @moduledoc """
  Provider-neutral representation of an agent pull request review.
  """
  require EEx

  @max_comments 3

  defmodule FileSummary do
    defstruct [:filename, :summary]

    @type t :: %__MODULE__{filename: binary, summary: binary}
  end

  defmodule Comment do
    defstruct [:filename, :line, :end_line, :title, :body, :priority]

    @type priority :: :p0 | :p1 | :p2 | :p3
    @type t :: %__MODULE__{
            filename: binary,
            line: pos_integer,
            end_line: pos_integer | nil,
            title: binary,
            body: binary,
            priority: priority
          }
  end

  defstruct [:url, :confidence, :summary, :confidence_comment, files: [], comments: []]

  @type confidence :: :a | :b | :c | :d | :e | :f
  @type t :: %__MODULE__{
          url: binary,
          confidence: confidence,
          summary: binary,
          confidence_comment: binary,
          files: [FileSummary.t()],
          comments: [Comment.t()]
        }

  @spec new(map) :: t
  def new(%{} = attrs) do
    attrs
    |> Map.update(:files, [], &to_structs(&1, FileSummary))
    |> Map.update(:comments, [], &(to_structs(&1, Comment) |> Enum.take(@max_comments)))
    |> then(&struct(__MODULE__, &1))
  end

  @spec summary(t) :: binary
  def summary(%__MODULE__{} = review) do
    summary_template(review: review)
    |> String.trim()
  end

  @spec inline_body(Comment.t()) :: binary
  def inline_body(%Comment{} = comment) do
    inline_template(comment: comment)
    |> String.trim()
  end

  defp to_structs(nil, _), do: []
  defp to_structs(items, module), do: Enum.map(items, &to_struct(&1, module))

  defp to_struct(item, module) when is_struct(item, module), do: item
  defp to_struct(item, module), do: struct(module, item)

  EEx.function_from_file(
    :defp,
    :summary_template,
    Path.join([:code.priv_dir(:console), "pr", "agent_review_summary.md.eex"]),
    [:assigns]
  )

  EEx.function_from_file(
    :defp,
    :inline_template,
    Path.join([:code.priv_dir(:console), "pr", "agent_review_inline.md.eex"]),
    [:assigns]
  )
end
