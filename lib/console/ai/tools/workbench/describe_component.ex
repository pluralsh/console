defmodule Console.AI.Tools.Workbench.DescribeComponent do
  use Console.AI.Tools.Agent.Base
  alias Console.Repo
  alias Console.Schema.{ServiceComponent, User}
  alias Console.Schema.ServiceComponent.Mini
  alias Console.Deployments.Policies
  alias Console.AI.Tools.Workbench.Output

  embedded_schema do
    field :component_id, :string
  end

  @valid ~w(component_id)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required(@valid)
    |> check_uuid(:component_id)
  end

  @json_schema Console.priv_file!("tools/workbench/describe_component.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: "describe_component"
  def description(), do: "Returns the Kubernetes resources belonging to a Plural service component, feel free to query any individually using the python sandbox's native k8s functions if needed."

  def implement(%__MODULE__{component_id: component_id}) do
    with {:actor, %User{} = user} <- {:actor, Tool.actor()},
         {:comp, %ServiceComponent{} = comp} <-
           {:comp,
            Repo.get(ServiceComponent, component_id)
            |> Repo.preload([:children, service: [:cluster, :repository]])},
         {:allow, {:ok, _}} <- {:allow, Policies.allow(comp.service, user, :read)} do
      comp
      |> Mini.new()
      |> Map.from_struct()
      |> Output.json()
    else
      {:actor, _} -> {:error, "no user found"}
      {:comp, _} -> {:error, "component not found or not a member of this Plural service"}
      {:allow, _} -> {:error, "user does not have read access to this component"}
      err -> {:error, "internal error fetching component children: #{inspect(err)}"}
    end
  end
end
