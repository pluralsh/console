defmodule Console.Schema.ClusterUpgradeStep do
  use Piazza.Ecto.Schema
  alias Console.Schema.{ClusterUpgrade, AgentRun}

  defenum Type, addon: 0, cloud_addon: 1, infrastructure: 2

  schema "cluster_upgrade_steps" do
    field :name,   :string
    field :prompt, :string
    field :error,  :binary
    field :type,   Type
    field :status, ClusterUpgrade.Status, default: :pending

    belongs_to :upgrade, ClusterUpgrade
    belongs_to :agent_run, AgentRun

    timestamps()
  end

  @valid ~w(name prompt error type status upgrade_id agent_run_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:upgrade_id)
    |> foreign_key_constraint(:agent_run_id)
    |> validate_required([:name, :prompt, :type, :status])
  end
end
