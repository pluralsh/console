defmodule Console.AI.Tools.Workbench.KubeDrain do
  use Ecto.Schema
  import Ecto.Changeset
  alias Console.AI.Tools.Workbench.KubeRequest

  embedded_schema do
    field :handle,      :string
    field :node,        :string
    field :explanation, :string
    field :approval,    :map, virtual: true
  end

  def new(attrs) do
    {:ok, struct(__MODULE__, attrs)}
  end

  def changeset(model, attrs) do
    model
    |> cast(attrs, ~w(handle node explanation approval)a)
    |> validate_required([:handle, :node, :explanation])
  end

  def invoke(%__MODULE__{} = drain, user) do
    {:ok, request} =
      KubeRequest.new(
        handle: drain.handle,
        method: "put",
        path: "/api/v1/node/#{URI.encode(drain.node)}/drain",
        body: "{}",
        content_type: "application/json"
      )

    KubeRequest.invoke(request, user)
  end
end
