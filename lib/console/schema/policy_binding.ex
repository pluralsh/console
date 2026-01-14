defmodule Console.Schema.PolicyBinding do
  use Piazza.Ecto.Schema
  alias Console.Schema.{User, Group}

  schema "policy_bindings" do
    field :policy_id, :binary_id
    belongs_to :user, User
    belongs_to :group, Group

    timestamps()
  end

  def dangling(query \\ __MODULE__) do
    from(p in query,
      where:
        fragment("NOT EXISTS(SELECT 1 FROM services WHERE write_policy_id = ? OR read_policy_id = ?)", p.policy_id, p.policy_id) and
        fragment("NOT EXISTS(SELECT 1 FROM clusters WHERE write_policy_id = ? OR read_policy_id = ?)", p.policy_id, p.policy_id) and
        fragment("NOT EXISTS(SELECT 1 FROM projects WHERE write_policy_id = ? OR read_policy_id = ?)", p.policy_id, p.policy_id) and
        fragment("NOT EXISTS(SELECT 1 FROM pipelines WHERE write_policy_id = ? OR read_policy_id = ?)", p.policy_id, p.policy_id) and
        fragment("NOT EXISTS(SELECT 1 FROM stacks WHERE write_policy_id = ? OR read_policy_id = ?)", p.policy_id, p.policy_id) and
        fragment("NOT EXISTS(SELECT 1 FROM catalogs WHERE write_policy_id = ? OR read_policy_id = ? OR create_policy_id = ?)", p.policy_id, p.policy_id, p.policy_id) and
        fragment("NOT EXISTS(SELECT 1 FROM deployment_settings WHERE write_policy_id = ? OR read_policy_id = ? OR create_policy_id = ? OR git_policy_id = ?)", p.policy_id, p.policy_id, p.policy_id, p.policy_id) and
        fragment("NOT EXISTS(SELECT 1 FROM pr_automations WHERE write_policy_id = ? OR create_policy_id = ?)", p.policy_id, p.policy_id) and
        fragment("NOT EXISTS(SELECT 1 FROM flows WHERE write_policy_id = ? OR read_policy_id = ?)", p.policy_id, p.policy_id) and
        fragment("NOT EXISTS(SELECT 1 FROM cluster_providers WHERE write_policy_id = ? OR read_policy_id = ?)", p.policy_id, p.policy_id) and
        fragment("NOT EXISTS(SELECT 1 FROM mcp_servers WHERE write_policy_id = ? OR read_policy_id = ?)", p.policy_id, p.policy_id) and
        fragment("NOT EXISTS(SELECT 1 FROM oidc_providers WHERE bindings_id = ? OR write_policy_id = ?)", p.policy_id, p.policy_id) and
        fragment("NOT EXISTS(SELECT 1 FROM personas WHERE bindings_id = ?)", p.policy_id) and
        fragment("NOT EXISTS(SELECT 1 FROM watchman_users WHERE assume_policy_id = ?)", p.policy_id) and
        fragment("NOT EXISTS(SELECT 1 FROM pull_requests WHERE notifications_policy_id = ?)", p.policy_id) and
        fragment("NOT EXISTS(SELECT 1 FROM cloud_connections WHERE read_policy_id = ?)", p.policy_id) and
        fragment("NOT EXISTS(SELECT 1 FROM compliance_report_generators WHERE read_policy_id = ?)", p.policy_id) and
        fragment("NOT EXISTS(SELECT 1 FROM agent_runtimes WHERE create_policy_id = ?)", p.policy_id)
    )
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :id]) do
    from(p in query, order_by: ^order)
  end

  @valid ~w(user_id group_id policy_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:user_id)
    |> foreign_key_constraint(:group_id)
  end
end
