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
end
