defmodule Console.Schema.WorkbenchChatbot do
  use Console.Schema.Base
  alias Console.Schema.{ChatConnection, PolicyBinding, User, Workbench}
  alias Console.Deployments.Policies.Rbac
  alias Console.Schema.WorkbenchJob.Modes

  defenum MessageBehavior, reply: 0, message: 1

  schema "workbench_chatbots" do
    field :channel, :string
    field :prompt,  :string
    field :message_behavior, MessageBehavior, default: :reply

    embeds_one :modes, Modes, on_replace: :update

    belongs_to :workbench,       Workbench
    belongs_to :chat_connection, ChatConnection
    belongs_to :user,            User

    timestamps()
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :inserted_at]) do
    from(c in query, order_by: ^order)
  end

  def for_workbench(query \\ __MODULE__, workbench_id) do
    from(c in query, where: c.workbench_id == ^workbench_id)
  end

  def for_chat_connection(query \\ __MODULE__, chat_connection_id) do
    from(c in query, where: c.chat_connection_id == ^chat_connection_id)
  end

  def for_project(query \\ __MODULE__, project_id) do
    from(c in query,
      join: w in assoc(c, :workbench),
      where: w.project_id == ^project_id
    )
  end

  def search(query \\ __MODULE__, q) do
    from(c in query, where: ilike(c.channel, ^"%#{q}%"))
  end

  def for_user(query \\ __MODULE__, %User{} = user) do
    Rbac.globally_readable(query, user, fn query, id, groups ->
      from(c in query,
        join: w in assoc(c, :workbench),
        join: p in assoc(w, :project),
        left_join: b in PolicyBinding,
          on: b.policy_id == w.read_policy_id or b.policy_id == w.write_policy_id
                or b.policy_id == p.read_policy_id or b.policy_id == p.write_policy_id,
        where: b.user_id == ^id or b.group_id in ^groups,
        distinct: true
      )
    end)
  end

  @valid ~w(workbench_id message_behavior chat_connection_id user_id channel prompt)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:modes)
    |> foreign_key_constraint(:workbench_id)
    |> foreign_key_constraint(:chat_connection_id)
    |> foreign_key_constraint(:user_id)
    |> unique_constraint(:channel)
    |> validate_required([:workbench_id, :chat_connection_id, :channel])
  end
end
