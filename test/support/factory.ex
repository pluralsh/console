defmodule Console.Factory do
  use ExMachina.Ecto, repo: Console.Repo
  alias Console.Schema

  def build_factory do
    %Schema.Build{
      repository: sequence(:repo, &"repo-#{&1}"),
      status: :queued,
      type: :deploy,
      creator: build(:user)
    }
  end

  def command_factory do
    %Schema.Command{
      build: build(:build),
      command: "some command"
    }
  end

  def webhook_factory do
    %Schema.Webhook{
      url: sequence(:webhook, &"https://example.com/#{&1}"),
      type: :piazza,
      health: :healthy
    }
  end

  def user_factory do
    %Schema.User{
      name: "Some User",
      email: sequence(:user, &"user-#{&1}@example.com")
    }
  end

  def group_factory do
    %Schema.Group{
      name: sequence(:group, &"group-#{&1}"),
      description: "description"
    }
  end

  def group_member_factory do
    %Schema.GroupMember{
      user: build(:user),
      group: build(:group)
    }
  end

  def role_factory do
    %Schema.Role{
      name: sequence(:role, &"role-#{&1}"),
      repositories: ["*"],
      permissions: %{read: true}
    }
  end

  def role_binding_factory do
    %Schema.RoleBinding{
      role: build(:role)
    }
  end

  def invite_factory do
    %Schema.Invite{
      email: sequence(:invite, &"someone-#{&1}@example.com"),
      secure_id: sequence(:invite, &"secure-#{&1}")
    }
  end

  def changelog_factory do
    %Schema.Changelog{
      repo: "repo",
      tool: sequence(:changelog, & "tool-#{&1}"),
      build: build(:build)
    }
  end

  def lock_factory do
    %Schema.Lock{
      holder: Ecto.UUID.generate(),
      name: "dummy",
      expires_at: Timex.now() |> Timex.shift(minutes: 20)
    }
  end

  def audit_factory do
    %Schema.Audit{
      type: :build,
      action: :create,
      repository: "repo",
      actor: build(:user)
    }
  end

  def upgrade_policy_factory do
    %Schema.UpgradePolicy{
      type: :deploy,
      name: sequence(:upgrade_policy, &"upg-#{&1}"),
      target: "repo"
    }
  end

  def alertmanager_incident_factory do
    %Schema.AlertmanagerIncident{incident_id: Ecto.UUID.generate()}
  end

  def runbook_execution_factory do
    %Schema.RunbookExecution{
      name: "runbook",
      namespace: "namespace",
      context: %{dummy: "value"},
      user: build(:user)
    }
  end

  def notification_factory do
    %Schema.Notification{
      title: "title",
      description: "description",
      repository: "repository",
      fingerprint: sequence(:notification, & "notif-#{&1}"),
      annotations: %{},
      labels: %{},
      seen_at: Timex.now()
    }
  end

  def leader_factory do
    %Schema.Leader{
      name: sequence(:leader, & "leader-#{&1}"),
      ref: self(),
      heartbeat: Timex.now()
    }
  end

  def postgres_instance_factory do
    %Schema.PostgresInstance{
      name: sequence(:pg_name, & "pg-#{&1}"),
      uid: Ecto.UUID.generate()
    }
  end

  def cluster_provider_factory do
    %Schema.ClusterProvider{
      name: sequence(:provider_name, & "provider-#{&1}"),
      namespace: sequence(:provider_namespace, & "ns-#{&1}")
    }
  end

  def cluster_factory do
    %Schema.Cluster{
      provider: build(:cluster_provider),
      name: sequence(:cluster_name, & "cluster-#{&1}")
    }
  end

  def git_repository_factory do
    %Schema.GitRepository{
      url: sequence(:git_repo, & "https://github.com/pluralsh/repo-#{&1}.git")
    }
  end

  def service_factory do
    %Schema.Service{
      name: sequence(:service, & "service-#{&1}"),
      version: "0.0.1",
      cluster: build(:cluster),
      repository: build(:git_repository),
    }
  end

  def service_component_factory do
    %Schema.ServiceComponent{
      group: "networking.k8s.io",
      version: "v1",
      kind: "ingress",
      namespace: "name",
      name: "name",
      synced: true,
      state: :running,
      service: build(:service)
    }
  end

  def setup_rbac(user, repos \\ ["*"], perms) do
    role = insert(:role, repositories: repos, permissions: Map.new(perms))
    insert(:role_binding, role: role, user: user)
  end

  def admin_user() do
    insert(:user, roles: %{admin: true})
  end
end
