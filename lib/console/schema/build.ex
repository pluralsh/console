defmodule Console.Schema.Build do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Command, Changelog, User}

  @expiry 30

  defenum Type, deploy: 0, bounce: 1, approval: 2, install: 3
  defenum Status, queued: 0, running: 1, successful: 2, failed: 3, cancelled: 4, pending: 5

  schema "builds" do
    field :repository,   :string
    field :type,         Type
    field :status,       Status
    field :message,      :string
    field :sha,          :string
    field :completed_at, :utc_datetime_usec
    field :pinged_at,    :utc_datetime_usec
    field :context,      :map
    field :deployer,     :string, virtual: true

    has_many :commands, Command
    has_many :changelogs, Changelog

    belongs_to :creator,  User
    belongs_to :approver, User

    timestamps()
  end

  def for_repository(query \\ __MODULE__, repo) do
    from(b in query, where: b.repository == ^repo)
  end

  def ordered(query \\ __MODULE__, order \\ [desc: :inserted_at]) do
    from(b in query, order_by: ^order)
  end

  def first(query \\ __MODULE__) do
    from(b in query, limit: 1)
  end

  def with_status(query \\ __MODULE__, status) do
    from(b in query, where: b.status == ^status)
  end

  def queued(query \\ __MODULE__), do: with_status(query, :queued)

  def expired(query \\ __MODULE__) do
    expiry = Timex.now() |> Timex.shift(days: -@expiry)
    older_than(query, expiry)
  end

  def older_than(query \\ __MODULE__, time) do
    from(b in query, where: b.inserted_at <= ^time)
  end

  def pinged(query \\ __MODULE__, time) do
    from(b in query, where: (not is_nil(b.pinged_at) and b.pinged_at <= ^time) or (is_nil(b.pinged_at) and b.inserted_at <= ^time))
  end

  @valid ~w(repository type status completed_at approver_id message sha context)a

  def changeset(schema, attrs \\ %{}) do
    schema
    |> cast(attrs, @valid)
    |> validate_required([:repository, :type, :status])
    |> validate_length(:message, max: 10_000)
  end
end
