defmodule Console.AI.Tools.Workbench.Infrastructure.ServiceInspect do
  use Console.AI.Tools.Agent.Base
  alias Console.Repo
  alias Console.Deployments.{Policies, Services}
  alias Console.Schema.{User, Service, VulnerabilityReport}
  alias Console.AI.Tools.Workbench.Infrastructure.VulnReports

  require EEx

  embedded_schema do
    field :user,         :map, virtual: true
    field :service_id,   :string
    field :vuln_reports, :boolean
  end

  @valid ~w(service_id vuln_reports)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> check_uuid(:service_id)
    |> validate_required([:service_id])
  end

  @json_schema Console.priv_file!("tools/workbench/infrastructure/service.json") |> Jason.decode!()

  def json_schema(_), do: @json_schema
  def name(_), do: "plrl_service"
  def description(_), do: "Get detailed information about a Plural service by id (from plrl_cluster_services)."

  def implement(%__MODULE__{user: %User{} = user, service_id: id} = model) do
    Services.get_service(id)
    |> Repo.preload([:repository, :cluster, :errors, owner: [parent: :cluster], parent: [:cluster]])
    |> Policies.allow(user, :read)
    |> case do
      {:ok, nil} -> {:error, "could not find service with id #{id}"}
      {:ok, svc} -> {:ok, String.trim(service_prompt(service: svc, vulns: sideload_vulns(svc, model.vuln_reports)))}
      nil -> {:error, "could not find service with id #{id}"}
      error -> error
    end
  end

  defp sideload_vulns(%Service{id: id}, true) do
    VulnerabilityReport.for_service(id)
    |> Repo.all()
    |> Enum.map(&VulnReports.simplify/1)
  end
  defp sideload_vulns(_, _), do: []

  EEx.function_from_file(
    :defp,
    :service_prompt,
    Path.join(:code.priv_dir(:console), "prompts/workbench/infrastructure/service.md.eex"),
    [:assigns]
  )
end
