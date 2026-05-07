defmodule Console.AI.Tools.Workbench.Infrastructure.Vulns do
  use Console.AI.Tools.Agent.Base
  alias Console.Repo
  alias Console.Schema.{VulnerabilityReport, Vulnerability}

  embedded_schema do
    field :user,       :map, virtual: true
    field :report_id,  :binary_id
  end

  @valid ~w(report_id)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> check_uuid(:report_id)
  end

  @json_schema Console.priv_file!("tools/workbench/infrastructure/vulns.json") |> Jason.decode!()

  def json_schema(_), do: @json_schema
  def name(_), do: "plrl_vulns"
  def description(_), do: "Lists vulnerabilities for a given report."

  @keep ~w(
    resource
    fixed_version
    installed_version
    severity
    score
    title
    description
    primary_link
    links
    target
    package_type
    pkg_path
    published_date
    last_modified_date
    repository_url
  )a

  def implement(%__MODULE__{user: user, report_id: report_id}) do
    Repo.get(VulnerabilityReport, report_id)
    |> Policies.allow(user, :read)
    |> when_ok(fn _ ->
      Vulnerability.for_report(report_id)
      |> Repo.all()
      |> Enum.map(&Map.take(&1, @keep))
      |> Jason.encode!()
    end)
  end
end
