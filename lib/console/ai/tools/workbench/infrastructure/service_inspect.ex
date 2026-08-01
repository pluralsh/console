defmodule Console.AI.Tools.Workbench.Infrastructure.ServiceInspect do
  use Console.AI.Tools.Agent.Base
  import Console.AI.Tools.Workbench.Base
  alias Console.Repo
  alias Console.Deployments.{Policies, Services}
  alias Console.Schema.{User, Service, VulnerabilityReport}
  alias Console.AI.Tools.Workbench.Infrastructure.{SideloadQuery, VulnReports}

  require EEx

  embedded_schema do
    field :job,          :map, virtual: true
    field :user,         :map, virtual: true
    field :service_id,   :string
    field :vuln_reports, :boolean

    embeds_one :components, SideloadQuery, on_replace: :update
  end

  @valid ~w(service_id vuln_reports)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:components)
    |> check_uuid(:service_id)
    |> validate_required([:service_id])
  end

  @json_schema Console.priv_file!("tools/workbench/infrastructure/service.json") |> Jason.decode!()

  def json_schema(_), do: @json_schema
  def name(_), do: "plrl_service"
  def description(_), do: "Get detailed information about a Plural service by id (from plrl_cluster_services)."

  @preloads [:repository, :cluster, :errors, owner: [parent: :cluster], parent: [:cluster]]

  def implement(%__MODULE__{user: %User{} = user, service_id: id} = model) do
    with %Service{} = svc <- Services.get_service(id) |> Repo.preload(@preloads),
         {:ok, svc} <- Policies.allow(svc, user, :read),
         {:ok, svc} <- check_flow(svc, model.job) do
      {:ok,
       String.trim(
         service_prompt(
           service: svc,
           vulns: sideload_vulns(svc, model.vuln_reports),
           components: sideload_components(svc, model.components)
         )
       )}
    else
      nil -> {:error, "could not find service with id #{id}"}
      {:error, err} -> {:error, "failed to inspect service, reason: #{inspect(err)}"}
      error -> error
    end
  end

  defp sideload_vulns(%Service{id: id}, true) do
    VulnerabilityReport.for_service(id)
    |> Repo.all()
    |> Enum.map(&VulnReports.simplify/1)
  end
  defp sideload_vulns(_, _), do: []

  defp sideload_components(%Service{} = svc, %SideloadQuery{fetch: true} = query) do
    svc
    |> Repo.preload(:components)
    |> Map.get(:components, [])
    |> SideloadQuery.filter(query, &component_search_targets/1)
    |> Enum.map(&simplify_component/1)
  end
  defp sideload_components(_, _), do: []

  defp component_search_targets(comp) do
    api_version = Kube.Utils.api_version(comp.group, comp.version)

    [
      comp.id,
      api_version,
      comp.group,
      comp.version,
      comp.kind,
      comp.namespace,
      comp.name,
      comp.state,
      Enum.join([comp.namespace, comp.name], "/"),
      Enum.join([comp.kind, comp.namespace, comp.name], "/"),
      Enum.join([api_version, comp.kind, comp.namespace, comp.name], "/")
    ]
  end

  defp simplify_component(comp) do
    %{
      id: comp.id,
      api_version: Kube.Utils.api_version(comp.group, comp.version),
      group: comp.group,
      version: comp.version,
      kind: comp.kind,
      namespace: comp.namespace,
      name: comp.name,
      state: comp.state,
      synced: comp.synced
    }
  end

  EEx.function_from_file(
    :defp,
    :service_prompt,
    Path.join(:code.priv_dir(:console), "prompts/workbench/infrastructure/service.md.eex"),
    [:assigns]
  )
end
