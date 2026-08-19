defmodule Console.AI.Tools.Workbench.KubeRequest do
  use Ecto.Schema
  import Ecto.Changeset
  alias Console.Deployments.Clusters

  embedded_schema do
    field :handle,       :string
    field :method,       :string
    field :path,         :string
    field :body,         :string
    field :query_params, :map, default: %{}
    field :content_type, :string
    field :explanation,  :string
    field :approval,     :map, virtual: true
  end

  def new(attrs) do
    {:ok, struct(__MODULE__, attrs)}
  end

  def changeset(model, attrs) do
    model
    |> cast(attrs, ~w(handle method path body query_params content_type explanation approval)a)
    |> validate_required([:handle, :method, :path, :content_type])
  end

  def invoke(%__MODULE__{handle: handle, query_params: query_params} = model, user) do
    cluster = Clusters.get_cluster_by_handle(handle)

    Kazan.run(%Kazan.Request{
      method: model.method,
      path: model.path,
      body: model.body,
      content_type: model.content_type,
      query_params: query_params || %{},
      response_model: Kube.Client.EchoModel
    }, server: Clusters.control_plane(cluster, user))
  end
end
