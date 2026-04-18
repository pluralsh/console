defmodule Console.AI.Tools.Workbench.Infrastructure.ServiceInspect do
  use Console.AI.Tools.Agent.Base
  alias Console.Repo
  alias Console.Deployments.{Policies, Services}
  alias Console.Schema.{User}

  require EEx

  embedded_schema do
    field :user, :map, virtual: true
    field :service_id, :string
  end

  @valid ~w(service_id)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> check_uuid(:service_id)
    |> validate_required(@valid)
  end

  @json_schema Console.priv_file!("tools/workbench/infrastructure/service.json") |> Jason.decode!()

  def json_schema(_), do: @json_schema
  def name(_), do: "plrl_service"
  def description(_), do: "Get detailed information about a Plural service by id (from plrl_cluster_services)."

  def implement(_, %__MODULE__{user: %User{} = user, service_id: id}) do
    Services.get_service(id)
    |> Repo.preload([:repository, :cluster, :errors, owner: [parent: :cluster], parent: [:cluster]])
    |> Policies.allow(user, :read)
    |> case do
      {:ok, svc} -> {:ok, String.trim(service_prompt(service: svc))}
      nil -> {:error, "could not find service with id #{id}"}
      error -> error
    end
  end

  EEx.function_from_file(
    :defp,
    :service_prompt,
    Path.join(:code.priv_dir(:console), "prompts/workbench/infrastructure/service.md.eex"),
    [:assigns]
  )
end
