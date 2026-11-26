defmodule Console.Schema.DevboxUpdateCampaign do
  @moduledoc """
  An admin's request to move a devbox's outdated instances to its current template revision (a new environment
  image or a new devbox-daemon), carried out by `Console.Devboxes.Updates`.

  An ordinary campaign only touches instances that lose nothing visible: suspended ones, and running ones that
  are idle.  A forced one (a CVE remediation) also restarts instances in use, after `notice_minutes` during which
  their users see a deadline.
  """
  use Console.Schema.Base
  alias Console.Schema.{Devbox, DevboxInstance, User}

  defenum Status, pending: 0, running: 1, completed: 2, cancelled: 3

  @active ~w(pending running)a
  @notice 10..30
  @default_notice 15
  @expiry_hours 24

  schema "devbox_update_campaigns" do
    field :force,           :boolean, default: false
    field :status,          Status, default: :pending
    field :reason,          :string
    field :starts_at,       :utc_datetime_usec
    field :notice_minutes,  :integer
    field :deadline_at,     :utc_datetime_usec
    field :expires_at,      :utc_datetime_usec
    field :max_concurrency, :integer, default: 5
    field :completed_at,    :utc_datetime_usec

    belongs_to :devbox, Devbox
    belongs_to :user,   User
    has_many :instances, DevboxInstance, foreign_key: :update_campaign_id

    timestamps()
  end

  def active?(%__MODULE__{status: status}), do: status in @active

  def for_devbox(query \\ __MODULE__, devbox_id) do
    from(c in query, where: c.devbox_id == ^devbox_id)
  end

  def with_share_lock(query \\ __MODULE__) do
    from(c in query, lock: "FOR SHARE")
  end

  def active(query \\ __MODULE__) do
    from(c in query, where: c.status in ^@active)
  end

  def started(query \\ __MODULE__, now \\ DateTime.utc_now()) do
    from(c in query, where: c.starts_at <= ^now)
  end

  def ordered(query \\ __MODULE__, order \\ [desc: :inserted_at]) do
    from(c in query, order_by: ^order)
  end

  @valid ~w(force reason starts_at notice_minutes max_concurrency devbox_id user_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:devbox_id)
    |> put_new_change(:starts_at, &DateTime.utc_now/0)
    |> validate_number(:max_concurrency, greater_than: 0, less_than_or_equal_to: 50)
    |> validate_length(:reason, max: 255)
    |> schedule()
    |> validate_required([:devbox_id, :starts_at, :expires_at])
  end

  def status_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(status completed_at)a)
    |> validate_required([:status])
  end

  # The notice only applies to forced campaigns, which are the ones that interrupt people.  It counts from when
  # the campaign can first tell them, so a start time in the past doesn't shorten it.
  defp schedule(cs) do
    now = DateTime.utc_now()
    starts = Enum.max([get_field(cs, :starts_at) || now, now], DateTime)
    cs = put_change(cs, :starts_at, starts)
    cs = put_change(cs, :expires_at, Timex.shift(starts, hours: @expiry_hours))
    case get_field(cs, :force) do
      true ->
        notice = get_field(cs, :notice_minutes) || @default_notice
        cs
        |> put_change(:notice_minutes, notice)
        |> validate_inclusion(:notice_minutes, @notice, message: "must be between #{@notice.first} and #{@notice.last} minutes")
        |> put_change(:deadline_at, Timex.shift(starts, minutes: notice))
      _ ->
        cs
        |> put_change(:notice_minutes, nil)
        |> put_change(:deadline_at, nil)
    end
  end
end
