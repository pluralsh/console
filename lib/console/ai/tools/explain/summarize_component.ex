defmodule Console.AI.Tools.Explain.SummarizeComponent do
  use Console.AI.Tools.Agent.Base
  import Console.AI.Tools.Utils
  alias Console.Repo
  alias Console.Schema.{Service, ServiceComponent}
  alias Console.AI.Summary.Summarizable

  embedded_schema do
    field :prompt, :string
    field :component_id, :string
  end

  @valid ~w(prompt component_id)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required([:prompt, :component_id])
  end

  @json_schema Console.priv_file!("tools/explain/summarize_component.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("query_component")
  def description(), do: "Deep introspects a given service component in kubernetes and answers any questions you might have about it.  Use this as a kubernetes oracle fo this specific resource"

  def implement(%__MODULE__{prompt: prompt, component_id: component_id}) do
    with {:svc, %Service{id: svc_id} = svc} <- {:svc, Tool.parent()},
         %Service{cluster: cluster} = svc <- Repo.preload(svc, :cluster),
         _ <- Console.AI.Evidence.Base.save_kubeconfig(cluster),
         {:comp, %ServiceComponent{service_id: ^svc_id} = comp} <- {:comp, Repo.get(ServiceComponent, component_id)},
         {:summary, {:ok, summary, true}} <- {:summary, Summarizable.summarize(%{comp | service: svc}, prompt)} do
      {:ok, summary}
    else
      {:summary, {:ok, _, false}} -> {:ok, "Could not find enough relevant information to answer the question in #{prompt}"}
      {:summary, err} -> {:error, "internal error summarizing component: #{inspect(err)}"}
      {:svc, _} -> {:error, "no service found"}
      {:comp, _} -> {:error, "component not found or not a member of this Plural service"}
      err -> {:error, "internal error fetching components: #{inspect(err)}"}
    end
  end
end
