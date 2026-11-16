defmodule Console.Schema.DevboxSnapshot do
  use Console.Schema.Base
  alias Console.Schema.{Workbench, Devbox, DevboxInstance, User}

  defenum Status, pending: 0, ready: 1, failed: 2, deleting: 3

  schema "devbox_snapshots" do
    field :name,              :string
    field :tag_ref,           :string
    field :fidelity,          DevboxInstance.Fidelity
    field :size_bytes,        :integer
    field :status,            Status, default: :pending
    field :error,             :string
    field :template_revision, :string

    belongs_to :workbench, Workbench
    belongs_to :devbox,    Devbox
    belongs_to :instance,  DevboxInstance
    belongs_to :user,      User

    timestamps()
  end

  def for_workbench(query \\ __MODULE__, workbench_id) do
    from(s in query, where: s.workbench_id == ^workbench_id)
  end

  def for_devbox(query \\ __MODULE__, devbox_id) do
    from(s in query, where: s.devbox_id == ^devbox_id)
  end

  def for_instance(query \\ __MODULE__, instance_id) do
    from(s in query, where: s.instance_id == ^instance_id)
  end

  def for_status(query \\ __MODULE__, status) do
    from(s in query, where: s.status == ^status)
  end

  def ordered(query \\ __MODULE__, order \\ [desc: :inserted_at]) do
    from(s in query, order_by: ^order)
  end

  def offset(query \\ __MODULE__, offset) do
    from(s in query, offset: ^offset)
  end

  @valid ~w(name tag_ref fidelity size_bytes status error template_revision workbench_id devbox_id instance_id user_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:workbench_id)
    |> foreign_key_constraint(:devbox_id)
    |> foreign_key_constraint(:instance_id)
    |> foreign_key_constraint(:id, name: :devbox_instances_snapshot_id_fkey, match: :exact)
    |> validate_number(:size_bytes, greater_than_or_equal_to: 0)
    |> validate_length(:name, max: 255)
    |> validate_required([:workbench_id, :devbox_id, :status])
  end
end
