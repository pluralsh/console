defmodule Console.Factory do
  use ExMachina.Ecto, repo: Console.Repo
  alias Console.Schema
  alias Console.Deployments.Settings

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
      assume_policy_id: Ecto.UUID.generate(),
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
      namespace: sequence(:provider_namespace, & "ns-#{&1}"),
      repository: build(:git_repository),
      write_policy_id: Ecto.UUID.generate(),
      read_policy_id: Ecto.UUID.generate(),
      git: %{ref: "master", folder: "providers"}
    }
  end

  def cluster_factory do
    %Schema.Cluster{
      version: "1.24",
      project: Settings.default_project!(),
      handle: sequence(:cluster_handle, & "handle-#{&1}"),
      provider: build(:cluster_provider),
      write_policy_id: Ecto.UUID.generate(),
      read_policy_id: Ecto.UUID.generate(),
      name: sequence(:cluster_name, & "cluster-#{&1}"),
      deploy_token: sequence(:deploy_token, & "deploy-#{&1}"),
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
      namespace: "test",
      version: "0.0.1",
      git: %{ref: "main", folder: "k8s"},
      write_policy_id: Ecto.UUID.generate(),
      read_policy_id: Ecto.UUID.generate(),
      cluster: build(:cluster),
      repository: build(:git_repository),
    }
  end

  def revision_factory do
    %Schema.Revision{
      service: build(:service)
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

  def access_token_factory do
    %Schema.AccessToken{
      token: sequence(:access_token, & "console-#{&1}"),
      user: build(:user)
    }
  end

  def access_token_audit_factory do
    %Schema.AccessTokenAudit{
      token: build(:access_token)
    }
  end

  def deployment_settings_factory do
    %Schema.DeploymentSettings{
      name: "global",
      write_policy_id: Ecto.UUID.generate(),
      read_policy_id: Ecto.UUID.generate(),
      git_policy_id: Ecto.UUID.generate(),
      create_policy_id: Ecto.UUID.generate(),
      artifact_repository: build(:git_repository),
      deployer_repository: build(:git_repository)
    }
  end

  def api_deprecation_factory do
    %Schema.ApiDeprecation{
      blocking: false,
      component: build(:service_component)
    }
  end

  def global_service_factory do
    %Schema.GlobalService{
      name: sequence(:global_service, & "gs-#{&1}"),
      service: build(:service),
    }
  end

  def deploy_token_factory do
    %Schema.DeployToken{
      token: sequence(:deploy_token, & "deploy-#{&1}"),
      cluster: build(:cluster)
    }
  end

  def cluster_revision_factory do
    %Schema.ClusterRevision{
      cluster: build(:cluster),
      version: "1.23"
    }
  end

  def provider_credential_factory do
    %Schema.ProviderCredential{
      name: sequence(:credential, & "cred-#{&1}"),
      namespace: sequence(:credential_ns, & "plrl-capi-cred-#{&1}"),
      kind: "Secret",
      provider: build(:cluster_provider)
    }
  end

  def pipeline_factory do
    %Schema.Pipeline{
      name: sequence(:pipeline, & "pipeline-#{&1}"),
      project: Settings.default_project!(),
      write_policy_id: Ecto.UUID.generate(),
      read_policy_id: Ecto.UUID.generate()
    }
  end

  def pipeline_stage_factory do
    %Schema.PipelineStage{
      name: sequence(:pipeline_stage, & "stage-#{&1}")
    }
  end

  def pipeline_edge_factory do
    %Schema.PipelineEdge{
      from: build(:pipeline_stage),
      to: build(:pipeline_stage)
    }
  end

  def stage_service_factory do
    %Schema.StageService{
      stage: build(:pipeline_stage),
      service: build(:service),
    }
  end

  def pipeline_promotion_factory do
    %Schema.PipelinePromotion{
      stage: build(:pipeline_stage),
    }
  end

  def promotion_service_factory do
    %Schema.PromotionService{
      promotion: build(:pipeline_promotion),
      service: build(:service),
      revision: build(:revision)
    }
  end

  def promotion_criteria_factory do
    %Schema.PromotionCriteria{
      source: build(:service)
    }
  end

  def pipeline_gate_factory do
    %Schema.PipelineGate{
      state: :pending,
      name: sequence(:gate, & "gate-#{&1}"),
      edge: build(:pipeline_edge),
      type: :approval
    }
  end

  def runtime_service_factory do
    %Schema.RuntimeService{
      name: sequence(:rs_name, & "service-#{&1}"),
      version: "0.0.1",
      cluster: build(:cluster)
    }
  end

  def agent_migration_factory do
    %Schema.AgentMigration{
      ref: "agent-v0.30.3"
    }
  end

  def tag_factory do
    %Schema.Tag{}
  end

  def scope_factory do
    %Schema.AccessToken.Scope{}
  end

  def scm_connection_factory do
    %Schema.ScmConnection{
      type: :github,
      name: sequence(:scm_conn, & "conn-#{&1}"),
      token: sequence(:scm_conn, & "pat-#{&1}")
    }
  end

  def scm_webhook_factory do
    %Schema.ScmWebhook{
      type: :github,
      # name: sequence(:scm_conn, & "conn-#{&1}"),
      external_id: sequence(:scm_webhook, & "webhook-#{&1}"),
      hmac: sequence(:scm_webhook_hmac, & "hook-hmac-#{&1}")
    }
  end

  def pr_automation_factory do
    %Schema.PrAutomation{
      name: sequence(:pr_automation, & "pr-#{&1}"),
      title: "pr title",
      identifier: "some/repo",
      message: "pr message",
      project: Settings.default_project!(),
      write_policy_id: Ecto.UUID.generate(),
      create_policy_id: Ecto.UUID.generate(),
      connection: build(:scm_connection)
    }
  end

  def pull_request_factory do
    %Schema.PullRequest{
      title: "pr title",
      url: sequence(:pull_request, & "https://github.com/some/repo/#{&1}"),
      notifications_policy_id: Ecto.UUID.generate(),
    }
  end

  def service_context_factory do
    %Schema.ServiceContext{
      name: sequence(:svc_context, & "ctx-#{&1}")
    }
  end

  def object_store_factory do
    %Schema.ObjectStore{
      name: sequence(:object_store, & "os-#{&1}")
    }
  end

  def cluster_backup_factory do
    %Schema.ClusterBackup{
      name: sequence(:cb, & "cb-#{&1}"),
      namespace: "velero",
      cluster: build(:cluster)
    }
  end

  def cluster_restore_factory do
    %Schema.ClusterRestore{
      backup: build(:cluster_backup)
    }
  end

  def pipeline_context_factory do
    %Schema.PipelineContext{
      context: %{some: "context"},
      pipeline: build(:pipeline)
    }
  end

  def persona_factory do
    %Schema.Persona{
      name: sequence(:persona, & "persona-#{&1}"),
      bindings_id: Ecto.UUID.generate(),
      configuration: %{
        deployments: %{deployments: true},
        sidebar: %{kubernetes: true}
      }
    }
  end

  def notification_sink_factory do
    %Schema.NotificationSink{
      name: sequence(:sink, & "sink-#{&1}"),
      type: :slack,
      configuration: %{slack: %{url: "https://example.com"}}
    }
  end

  def notification_router_factory do
    %Schema.NotificationRouter{
      name: sequence(:router, & "router-#{&1}"),
      events: ["*"]
    }
  end

  def router_filter_factory do
    %Schema.RouterFilter{
      router: build(:notification_router)
    }
  end

  def router_sink_factory do
    %Schema.RouterSink{
      router: build(:notification_router),
      sink: build(:notification_sink)
    }
  end

  def refresh_token_factory do
    %Schema.RefreshToken{
      user: build(:user),
      token: sequence(:refresh, & "rt-#{&1}")
    }
  end

  def policy_constraint_factory do
    %Schema.PolicyConstraint{
      name: sequence(:constraint, & "constraint-#{&1}"),
      cluster: build(:cluster),
      ref: %{group: "SomeConstraint", name: "some-constraint"}
    }
  end

  def constraint_violation_factory do
    %Schema.ConstraintViolation{
      constraint: build(:policy_constraint),
      group: "networking.k8s.io",
      version: "v1",
      kind: "ingress",
      namespace: "name",
      name: "name",
      message: "you messed up"
    }
  end

  def managed_namespace_factory do
    %Schema.ManagedNamespace{
      name: sequence(:mns, &"namespace-#{&1}")
    }
  end

  def namespace_instance_factory do
    %Schema.NamespaceInstance{
      namespace: build(:managed_namespace),
      cluster: build(:cluster),
      service: build(:service)
    }
  end

  def namespace_cluster_factory do
    %Schema.NamespaceCluster{
      namespace: build(:managed_namespace),
      cluster: build(:cluster)
    }
  end

  def pinned_custom_resource_factory do
    %Schema.PinnedCustomResource{
      kind: "ConstraintTemplate",
      group: "gatekeeper.sh",
      version: "v1beta1",
      namespaced: false,
      display_name: "Constraint Templates",
      cluster: build(:cluster)
    }
  end

  def stack_factory do
    %Schema.Stack{
      name: sequence(:stacks, & "stack-#{&1}"),
      status: :queued,
      type: :terraform,
      project: Settings.default_project!(),
      write_policy_id: Ecto.UUID.generate(),
      read_policy_id: Ecto.UUID.generate(),
      git: %{ref: "main", folder: "terraform"},
      repository: build(:git_repository),
      cluster: build(:cluster),
    }
  end

  def stack_run_factory do
    %Schema.StackRun{
      id: Piazza.Ecto.UUID.generate_monotonic(),
      status: :queued,
      type: :terraform,
      dry_run: false,
      git: %{ref: "main", folder: "terraform"},
      repository: build(:git_repository),
      cluster: build(:cluster),
      stack: build(:stack),
    }
  end

  def stack_state_factory do
    %Schema.StackState{
      plan: "some plan"
    }
  end

  def stack_file_factory do
    %Schema.StackFile{
      path: "some/path",
      content: "some content"
    }
  end

  def stack_environment_factory do
    %Schema.StackEnvironment{
      name: "foo",
      value: "bar",
      secret: true
    }
  end

  def run_step_factory do
    %Schema.RunStep{
      name: sequence(:run_step, & "step-#{&1}"),
      status: :pending,
      stage: :plan,
      cmd: "terraform",
      args: ["plan"],
      index: 0,
      run: build(:stack_run)
    }
  end

  def run_log_factory do
    %Schema.RunLog{
      logs: "test logs",
      step: build(:run_step)
    }
  end

  def service_template_factory do
    %Schema.ServiceTemplate{
      name: sequence(:service_template, & "tpl-#{&1}")
    }
  end

  def observability_provider_factory do
    %Schema.ObservabilityProvider{
      type: :datadog,
      name: sequence(:obsv_provider, & "obs-#{&1}"),
      credentials: %{datadog: %{api_key: "api", app_key: "app"}}
    }
  end

  def service_dependency_factory do
    %Schema.ServiceDependency{
      name: sequence(:svc_dep, & "service-#{&1}"),
      service: build(:service)
    }
  end

  def observable_metric_factory do
    %Schema.ObservableMetric{
      identifier: sequence(:obsv_metric, & "obs-metric-#{&1}"),
      provider: build(:observability_provider)
    }
  end

  def terraform_state_factory do
    %Schema.TerraformState{
      stack: build(:stack)
    }
  end

  def custom_stack_run_factory do
    %Schema.CustomStackRun{
      stack: build(:stack),
      name: sequence(:csr, &"csr-#{&1}"),
      commands: [%{cmd: "echo", args: ["hello world"]}]
    }
  end

  def project_factory do
    %Schema.Project{
      name: sequence(:project, & "project-#{&1}"),
      write_policy_id: Ecto.UUID.generate(),
      read_policy_id: Ecto.UUID.generate(),
    }
  end

  def stack_definition_factory do
    %Schema.StackDefinition{
      name: sequence(:def, & "stack-def-#{&1}"),
      configuration: %{image: "stack/harness", tag: "0.1.0"},
      steps: [%{cmd: "cmd", args: ["arg"], stage: :apply}]
    }
  end

  def stack_cron_factory do
    %Schema.StackCron{
      crontab: "*/5 * * * *",
      stack: build(:stack),
      next_run_at: Timex.now(),
    }
  end

  def helm_repository_factory do
    %Schema.HelmRepository{
      url: sequence(:helm, &"https://helm-#{&1}.repository.io")
    }
  end

  def app_notification_factory do
    %Schema.AppNotification{
      user: build(:user),
      text: "some random notification",
      priority: :low
    }
  end

  def shared_secret_factory do
    %Schema.SharedSecret{
      name: "shared secret",
      handle: sequence(:shared_secret, & "shared-#{&1}"),
      secret: "super secret"
    }
  end

  def observer_factory do
    %Schema.Observer{
      name: sequence(:observer, & "obs-#{&1}"),
      status: :healthy,
      crontab: "*/5 * * * *",
      last_run_at: Timex.now(),
      next_run_at: Timex.now()
    }
  end

  def catalog_factory do
    %Schema.Catalog{
      name: sequence(:catalog, & "catalog-#{&1}"),
      author: "Plural",
      read_policy_id: Ecto.UUID.generate(),
      write_policy_id: Ecto.UUID.generate(),
      create_policy_id: Ecto.UUID.generate(),
      project: Settings.default_project!()
    }
  end

  def ai_insight_factory do
    %Schema.AiInsight{
      text: "some insight",
    }
  end

  def observability_webhook_factory(attrs) do
    %Schema.ObservabilityWebhook{
      type: Map.get(attrs, :type),
      name: sequence(:obs_hook, & "obs-wh-#{&1}"),
      external_id: sequence(:obs_id, & "obs-wh-id-#{&1}"),
      secret: Ecto.UUID.generate()
    }
  end

  def alert_factory do
    %Schema.Alert{
      type: :grafana,
      severity: :low,
      state: :firing,
      title: "blah",
      message: "blah",
      fingerprint: Ecto.UUID.generate(),
      annotations: %{"some" => "annotation"}
    }
  end

  def chat_factory do
    %Schema.Chat{
      role:    :assistant,
      content: "blah",
      seq:     sequence(:chat, & &1),
      thread:  build(:chat_thread)
    }
  end

  def cluster_insight_component_factory do
    %Schema.ClusterInsightComponent{
      group: "cert-manager.io",
      version: "v1",
      kind: "Certficate",
      namespace: "namespace",
      name: "name",
      cluster: build(:cluster)
    }
  end

  def chat_thread_factory do
    %Schema.ChatThread{
      user: build(:user),
      summary: "a chat thread",
    }
  end

  def ai_pin_factory do
    %Schema.AiPin{
      name: "my pin",
      user: build(:user),
      insight: build(:ai_insight)
    }
  end

  def vulnerability_report_factory do
    %Schema.VulnerabilityReport{
      artifact_url: sequence(:artifact_url, & "nginx:latest-#{&1}"),
      cluster: build(:cluster)
    }
  end

  def vulnerability_factory do
    %Schema.Vulnerability{
      report: build(:vulnerability_report)
    }
  end

  def pipeline_context_history_factory do
    %Schema.PipelineContextHistory{
      stage: build(:pipeline_stage),
      context: build(:pipeline_context)
    }
  end

  def cluster_usage_factory do
    %Schema.ClusterUsage{
      cluster: build(:cluster),
      cpu: 100,
      memory: 100,
      cpu_util: 50,
      memory_util: 50
    }
  end

  def cluster_usage_history_factory do
    %Schema.ClusterUsageHistory{
      timestamp: Timex.now(),
      cluster: build(:cluster),
      cpu: 100,
      memory: 100,
      cpu_util: 50,
      memory_util: 50
    }
  end

  def cluster_namespace_usage_factory do
    %Schema.ClusterNamespaceUsage{
      cluster: build(:cluster),
      namespace: sequence(:cnu, & "ns-#{&1}"),
      cpu: 100,
      memory: 100,
      cpu_util: 50,
      memory_util: 50
    }
  end

  def cluster_scaling_recommendation_factory do
    %Schema.ClusterScalingRecommendation{
      cluster: build(:cluster),
      namespace: sequence(:cnu, & "ns-#{&1}"),
      type: :deployment,
      name: "example",
      container: "nginx",
      cpu_request: 100,
      memory_request: 100,
      cpu_recommendation: 50,
      memory_recommendation: 50
    }
  end

  def cluster_audit_log_factory do
    %Schema.ClusterAuditLog{
      method: "GET",
      path: "/api/v1/namespaces",
      actor: build(:user),
      cluster: build(:cluster)
    }
  end

  def bootstrap_token_factory do
    %Schema.BootstrapToken{
      token:   sequence(:bootstrap_token, &"plrl-edge-#{&1}"),
      user:    build(:user),
      project: build(:project)
    }
  end

  def cluster_registration_factory do
    %Schema.ClusterRegistration{
      machine_id: sequence(:machine, & "machine-#{&1}"),
      project: build(:project),
      creator: build(:user)
    }
  end

  def cluster_iso_image_factory do
    %Schema.ClusterISOImage{
      image: sequence(:iso, & "iso:#{&1}"),
      registry: "dkr.plural.sh",
      project: build(:project),
      creator: build(:user)
    }
  end

  def cloud_addon_factory do
    %Schema.CloudAddon{
      cluster: build(:cluster),
      name: "ebs-csi-driver",
      version: "v1.38.1-eksbuild.2",
      distro: :eks
    }
  end

  def operational_layout_factory do
    %Schema.OperationalLayout{
      namespaces: %{cert_manager: "cert-manager", external_dns: "external-dns"}
    }
  end

  def alert_resolution_factory do
    %Schema.AlertResolution{
      alert: build(:alert),
      resolution: "resolved",
    }
  end

  def flow_factory do
    %Schema.Flow{
      name: sequence(:flows, & "flow-#{&1}"),
      project: Settings.default_project!(),
      write_policy_id: Ecto.UUID.generate(),
      read_policy_id: Ecto.UUID.generate(),
    }
  end

  def mcp_server_factory do
    %Schema.McpServer{
      name: sequence(:mcp_server, & "flow-#{&1}"),
      url: "http://example.com",
      project: Settings.default_project!(),
      write_policy_id: Ecto.UUID.generate(),
      read_policy_id: Ecto.UUID.generate(),
    }
  end

  def mcp_server_association_factory do
    %Schema.McpServerAssociation{
      flow: build(:flow),
      server: build(:mcp_server)
    }
  end

  def mcp_server_audit_factory do
    %Schema.McpServerAudit{
      tool: "some_tool",
      arguments: %{"my" => "arg"},
      actor: build(:user),
      server: build(:mcp_server)
    }
  end

  def oidc_provider_factory do
    %Schema.OIDCProvider{
      name: sequence(:oidc_provider, & "oidc-#{&1}"),
      client_id: sequence(:oidc_provider, & "oidc-client-#{&1}"),
      client_secret: Ecto.UUID.generate(),
      redirect_uris: ["https://example.com"],
      bindings_id: Ecto.UUID.generate(),
      write_policy_id: Ecto.UUID.generate(),
    }
  end

  def compliance_report_factory do
    %Schema.ComplianceReport{
      name: sequence(:compliance_report, & "compliance-report-#{&1}"),
      sha256: "sha256",
    }
  end

  def knowledge_entity_factory do
    %Schema.KnowledgeEntity{
      name: sequence(:knowledge_entity, & "knowledge-entity-#{&1}"),
      type: "entity type",
      description: "entity description"
    }
  end

  def knowledge_observation_factory do
    %Schema.KnowledgeObservation{
      entity: build(:knowledge_entity),
      observation: "some observation",
    }
  end

  def knowledge_relationship_factory do
    %Schema.KnowledgeRelationship{
      from: build(:knowledge_entity),
      to: build(:knowledge_entity),
      type: "relationship type"
    }
  end

  def preview_environment_template_factory do
    %Schema.PreviewEnvironmentTemplate{
      name: sequence(:preview_environment_template, & "preview-env-template-#{&1}"),
      flow: build(:flow),
      reference_service: build(:service)
    }
  end

  def preview_environment_instance_factory do
    %Schema.PreviewEnvironmentInstance{
      template: build(:preview_environment_template),
      service: build(:service),
      pull_request: build(:pull_request)
    }
  end

  def template_context_factory do
    %Schema.TemplateContext{}
  end

  def compliance_report_generator_factory do
    %Schema.ComplianceReportGenerator{
      name: sequence(:compliance_report_generator, & "compliance-report-generator-#{&1}"),
      format: :csv,
      read_policy_id: Ecto.UUID.generate()
    }
  end

  def setup_rbac(user, repos \\ ["*"], perms) do
    role = insert(:role, repositories: repos, permissions: Map.new(perms))
    insert(:role_binding, role: role, user: user)
  end

  def admin_user() do
    insert(:user, roles: %{admin: true})
  end

  def bootstrap_user() do
    token = insert(:bootstrap_token)
    %{token.user | bootstrap: token}
  end

  def bot(name) do
    insert(:user, bot_name: name, roles: %{admin: true})
  end
end
