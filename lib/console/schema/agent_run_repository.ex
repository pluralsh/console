defmodule Console.Schema.AgentRunRepository do
  use Console.Schema.Base
  alias Console.Schema.AgentRun

  schema "agent_run_repositories" do
    field :url,          :string
    field :last_used_at, :utc_datetime_usec

    timestamps()
  end

  def search(query \\ __MODULE__, q) do
    from(r in query, where: ilike(r.url, ^"%#{q}%"))
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :url]) do
    from(r in query, order_by: ^order)
  end

  def expired(query \\ __MODULE__) do
    from(r in query, where: r.last_used_at < ago(14, "day"))
  end

  @valid ~w(url last_used_at)a

  def changeset(struct, attrs) do
    struct
    |> cast(attrs, @valid)
    |> validate_required([:url])
    |> AgentRun.validate_repository(:url)
    |> validate_length(:url, max: 2048)
    |> validate_length(:url, min: 3)
  end
end
