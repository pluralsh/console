defmodule Console.Schema.OperationalLayout do
  use Piazza.Ecto.Schema
  alias Console.Schema.Cluster

  schema "operational_layouts" do
    embeds_one :namespaces, Namespaces, on_replace: :update do
      field :external_dns,   {:array, :string}
      field :cert_manager,   :string
      field :istio,          :string
      field :linkerd,        :string
      field :cilium,         :string
      field :ebs_csi_driver, :string
    end

    belongs_to :cluster, Cluster

    timestamps()
  end

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(cluster_id)a)
    |> cast_embed(:namespaces, with: &namespace_changeset/2)
  end

  defp namespace_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(external_dns istio cert_manager linkerd cilium ebs_csi_driver)a)
  end
end
