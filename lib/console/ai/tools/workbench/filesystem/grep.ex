defmodule Console.AI.Tools.Workbench.Filesystem.Grep do
  use Console.AI.Tools.Workbench.Base
  alias Console.AI.Tools.Workbench.Filesystem, as: Files
  alias Console.Deployments.WorkbenchFiles
  alias Console.Schema.Workbench

  embedded_schema do
    field :workbench,         :map, virtual: true
    field :user,              :map, virtual: true
    field :pattern,           :string
    field :path,              :string, default: "/"
    field :fixed_string,      :boolean
    field :case_insensitive,  :boolean
    field :before_context,    :integer
    field :after_context,     :integer
    field :max_matches,       :integer
  end

  @valid ~w(pattern path fixed_string case_insensitive before_context after_context max_matches)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required([:pattern])
    |> validate_number(:before_context, greater_than_or_equal_to: 0)
    |> validate_number(:after_context, greater_than_or_equal_to: 0)
    |> validate_number(:max_matches, greater_than: 0)
  end

  @json_schema Console.priv_file!("tools/workbench/filesystem/grep.json") |> Jason.decode!()

  def json_schema(_), do: @json_schema
  def name(_), do: "workbench_grep_files"
  def description(_), do: "Search the workbench filesystem for a pattern. Paths are under /workbench. Start with /workbench/INDEX.md when looking for something the workbench already knows."

  def implement(%__MODULE__{workbench: %Workbench{} = bench} = tool) do
    with {:ok, path} <- Files.tenant_path(tool.path || "/"),
         {:ok, matches} <- WorkbenchFiles.grep(bench, tool.pattern, grep_args(tool, path)),
      do: {:ok, Files.render_grep(matches)}
  end

  defp grep_args(tool, path) do
    %{
      path: path,
      fixed_string: tool.fixed_string,
      case_insensitive: tool.case_insensitive,
      before_context: tool.before_context,
      after_context: tool.after_context,
      max_matches: tool.max_matches
    }
  end
end
