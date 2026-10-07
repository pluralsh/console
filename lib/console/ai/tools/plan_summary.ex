defmodule Console.AI.Tools.PlanSummary do
  use Ecto.Schema
  import Ecto.Changeset
  require EEx

  embedded_schema do
    field :summary,          :string
    field :blast_radius,     :string
    field :critical_systems, {:array, :string}
    field :notable_changes,  {:array, :string}
    field :safety,           :string
  end

  @valid ~w(summary blast_radius critical_systems notable_changes safety)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required(@valid)
  end

  @json_schema Console.priv_file!("tools/plan_summary.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: "plural_plan_summary"
  def description(), do: "Summarize an infrastructure-as-code plan (for example a terraform plan). All text fields should be in commonmark markdown format"

  def preface() do
    """
    You're a seasoned devops engineer with experience in Kubernetes, GitOps and Infrastructure as Code.
    Summarize what this infrastructure plan will do so a non-expert can decide whether it is safe to apply.
    Call out blast radius, any critical systems that could be affected, the notable resource changes, and a clear safety assessment.
    Do not frame this as a root-cause analysis of an incident; there is no failure to diagnose.

    - Use Markdown formatting (e.g., `inline code`, ```code fences```, lists, tables).
    - When using markdown, use backticks to format file, directory, function, and class names.
    """
  end

  def implement(%__MODULE__{} = plan) do
    plan_template(
      summary: plan.summary,
      blast_radius: plan.blast_radius,
      critical_systems: plan.critical_systems || [],
      notable_changes: plan.notable_changes || [],
      safety: plan.safety
    )
    |> String.trim()
    |> then(& {:ok, &1})
  end

  EEx.function_from_file(:defp, :plan_template, Path.join([:code.priv_dir(:console), "plan_summary.md.eex"]), [:assigns])
end
