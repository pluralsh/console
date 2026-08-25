defmodule Console.GraphQl.Deployments.Policy do
  use Console.GraphQl.Schema.Base
  alias Console.GraphQl.Resolvers.Deployments

  ecto_enum :constraint_enforcement, Console.Schema.PolicyConstraint.Enforcement
  ecto_enum :vuln_severity, Console.Schema.Vulnerability.Severity
  ecto_enum :vuln_report_grade, Console.Schema.VulnerabilityReport.Grade
  ecto_enum :vuln_attack_vector, Console.Schema.Vulnerability.AttackVector
  ecto_enum :vuln_user_interaction, Console.Schema.Vulnerability.UserInteraction
  ecto_enum :compliance_report_format, Console.Schema.ComplianceReportGenerator.Format
  ecto_enum :policy_type, Console.Schema.Policy.Type
  ecto_enum :binding_policy_type, Console.Schema.BindingPolicy.Type

  enum :policy_aggregate do
    value :cluster
    value :enforcement
    value :installed
  end

  enum :constraint_violation_field do
    value :namespace
    value :kind
  end

  @desc "inputs to add constraint data from an OPA gatekeeper constraint CRD"
  input_object :policy_constraint_attributes do
    field :name,            non_null(:string)
    field :description,     :string
    field :recommendation,  :string
    field :violation_count, :integer
    field :ref,             :constraint_ref_attributes, description: "pointer to the group/name for the CR"
    field :violations,      list_of(:violation_attributes)
    field :enforcement,     :constraint_enforcement
  end

  @desc "Attributes for creating or updating a project-scoped policy. Name and policy source are required when creating a policy."
  input_object :policy_attributes do
    field :name,        :string, description: "unique policy name"
    field :type,        :policy_type, description: "policy implementation type"
    field :description, :string, description: "human-readable policy description"
    field :policy,      :string, description: "policy source text"
    field :project_id,  :id, description: "project that owns the policy; defaults to the deployment's default project when omitted"
  end

  input_object :binding_policy_attributes do
    field :policy_id, non_null(:id), description: "the policy to attach to matching targets"
    field :bind_policy_id, non_null(:id), description: "the policy that determines whether a target should be bound"
    field :type,      non_null(:binding_policy_type), description: "the resource type this policy can bind to"
    field :interval,  :string, description: "how often the binding policy is evaluated; defaults to 1h and cannot be below 30m"
    field :matches,   :binding_policy_matches_attributes, description: "criteria that determine when the policy applies"
  end

  input_object :binding_policy_update_attributes do
    field :policy_id, :id, description: "the policy to attach to matching targets"
    field :bind_policy_id, :id, description: "the policy that determines whether a target should be bound"
    field :type, non_null(:binding_policy_type), description: "the resource type this policy can bind to"
    field :interval, :string, description: "how often the binding policy is evaluated; cannot be below 30m"
    field :matches, :binding_policy_matches_attributes, description: "criteria that determine when the policy applies"
  end

  input_object :binding_policy_matches_attributes do
    field :workbench, :workbench_policy_matches_attributes
  end

  input_object :constraint_ref_attributes do
    field :kind, non_null(:string)
    field :name, non_null(:string)
  end

  input_object :violation_attributes do
    field :group,     :string
    field :version,   :string
    field :kind,      :string
    field :namespace, :string
    field :name,      :string
    field :message,   :string
  end

  input_object :vulnerability_report_attributes do
    field :artifact_url,      :string
    field :artifact_repo_url, :string, description: "the Git URL of the codebase defining this artifact"
    field :artifact_language, :agent_run_language, description: "the language the artifact is written in"
    field :artifact_language_version,  :string, description: "the language version of the artifact, if applicable"
    field :agent_runtime,     :string, description: "the agent runtime to use with this vulnerability report"
    field :os,                :vuln_os_attributes
    field :summary,           :vuln_summary_attributes
    field :artifact,          :vuln_artifact_attributes
    field :vulnerabilities,   list_of(:vulnerability_attributes)
    field :services,          list_of(:service_vuln_attributes)
    field :namespaces,        list_of(:namespace_vuln_attributes)
  end

  input_object :vuln_os_attributes do
    field :eosl,   :boolean
    field :family, :string
    field :name,   :string
  end

  input_object :vuln_summary_attributes do
    field :critical_count, :integer
    field :high_count,     :integer
    field :medium_count,   :integer
    field :low_count,      :integer
    field :unknown_count,  :integer
    field :none_count,     :integer
  end

  input_object :vuln_artifact_attributes do
    field :registry,   :string
    field :repository, :string
    field :digest,     :string
    field :tag,        :string
    field :mime,       :string
  end

  input_object :vulnerability_attributes do
    field :resource,          :string
    field :fixed_version,     :string
    field :installed_version, :string
    field :severity,          :vuln_severity
    field :score,             :float
    field :repository_url,    :string
    field :agent_runtime,     :string

    field :title,             :string
    field :description,       :string
    field :cvss_source,       :string
    field :primary_link,      :string
    field :links,             list_of(:string)
    field :target,            :string
    field :class,             :string
    field :package_type,      :string
    field :pkg_path,          :string
    field :vuln_id,           :string

    field :published_date,     :datetime
    field :last_modified_date, :datetime

    field :cvss, :cvss_bundle_attributes
  end

  input_object :cvss_bundle_attributes do
    field :nvidia, :cvss_attributes
    field :redhat, :cvss_attributes
  end

  input_object :cvss_attributes do
    field :v2_vector,  :string
    field :v3_vector,  :string
    field :v40_vector, :string
    field :v2_score,   :float
    field :v3_score,   :float
    field :v40_score,  :float
  end

  input_object :service_vuln_attributes do
    field :service_id, non_null(:id)
  end

  input_object :namespace_vuln_attributes do
    field :namespace, non_null(:string)
  end

  input_object :compliance_report_generator_attributes do
    field :format,        non_null(:compliance_report_format), description: "the format of the compliance report when a user generates it"
    field :name,          non_null(:string), description: "the name of this generator"
    field :read_bindings, list_of(:policy_binding_attributes)
  end

  @desc "A project-scoped policy that can be associated with workbenches to enforce policy decisions."
  object :policy do
    field :id,          non_null(:id), description: "unique policy identifier"
    field :name,        non_null(:string), description: "unique policy name"
    field :type,        non_null(:policy_type), description: "policy implementation type"
    field :description, :string, description: "human-readable policy description"
    field :policy,      non_null(:string), description: "policy source text"
    field :project,     :project, resolve: dataloader(Deployments), description: "project that owns this policy"

    @desc "Sampled evaluations that include this policy."
    connection field :policy_evaluations, node_type: :policy_evaluation do
      resolve &Deployments.list_policy_evaluations/3
    end

    connection field :stack_policies, node_type: :stack_policy do
      resolve &Deployments.list_policy_stack_policies/3
    end

    connection field :workbench_policies, node_type: :workbench_policy do
      resolve &Deployments.list_policy_workbench_policies/3
    end

    @desc "Workbench and stack associations currently attached to this policy."
    connection field :attachments, node_type: :policy_attachment do
      resolve &Deployments.list_policy_attachments/3
    end

    @desc "how many workbenches and stacks currently match this bind policy"
    field :match_count, :integer, resolve: &Deployments.policy_match_count/3

    @desc "how many sampled evaluations include this policy"
    field :evaluation_count, :integer, resolve: &Deployments.policy_evaluation_count/3

    @desc "how many workbenches and stacks are currently attached to this policy"
    field :attachment_count, :integer, resolve: &Deployments.policy_attachment_count/3

    timestamps()
  end

  @desc "A workbench or stack currently attached to a policy."
  object :policy_attachment do
    field :id,      non_null(:id)
    field :type,    non_null(:binding_policy_type)
    field :matches, :workbench_policy_matches
    field :workbench, :workbench
    field :stack,     :infrastructure_stack

    timestamps()
  end

  @desc "Associates a policy with a bindable resource type."
  object :binding_policy do
    field :id,           non_null(:id)
    field :type,         non_null(:binding_policy_type)
    field :interval,     non_null(:string)
    field :next_poll_at, :datetime
    field :matches, :binding_policy_matches

    field :policy, :policy, resolve: dataloader(Deployments)
    field :bind_policy, :policy, resolve: dataloader(Deployments)

    timestamps()
  end

  object :binding_policy_matches do
    field :workbench, :workbench_policy_matches
  end

  @desc "A sampled policy decision for a tool invocation."
  object :policy_evaluation do
    field :id,         non_null(:id), description: "unique policy evaluation identifier"
    field :policy_ids, non_null(list_of(non_null(:id))), description: "policies evaluated for this decision"
    field :input,      non_null(:map), description: "tool input evaluated by the policy"
    field :output,     non_null(:map), description: "policy evaluation result"

    timestamps()
  end

  @desc "A OPA Gatekeeper Constraint reference"
  object :policy_constraint do
    field :id,              non_null(:id)
    field :name,            non_null(:string)
    field :description,     :string
    field :recommendation,  :string
    field :violation_count, :integer
    field :enforcement,     :constraint_enforcement

    @desc "Fetches the live constraint object from K8s, this is an expensive query and should not be done in list endpoints"
    field :object, :kubernetes_unstructured do
      resolve &Deployments.fetch_constraint/3
      middleware ErrorHandler
    end

    field :ref, :constraint_ref, description: "pointer to the kubernetes resource itself"

    field :cluster, :cluster, resolve: dataloader(Deployments)
    field :violations, list_of(:violation), resolve: dataloader(Deployments)

    timestamps()
  end

  object :constraint_ref do
    field :kind, non_null(:string)
    field :name, non_null(:string)
  end

  @desc "A summary of statistics for violations w/in a specific column"
  object :violation_statistic do
    field :value,      :string, description: "the value of this field being aggregated"
    field :violations, :integer, description: "the total number of violations found"
    field :count,      :integer, description: "the total number of policy constraints"
  end

  @desc "Aggregate statistics for policies across your fleet"
  object :policy_statistic do
    field :aggregate, :string, description: "the field you're computing this statistic on"
    field :count,     :integer, description: "the count for this aggregate"
  end

  @desc "A violation of a given OPA Gatekeeper constraint"
  object :violation do
    field :id,        non_null(:id)
    field :group,     :string
    field :version,   :string
    field :kind,      :string
    field :namespace, :string
    field :name,      :string
    field :message,   :string

    timestamps()
  end

  object :vulnerability_report do
    field :id,                         non_null(:id)
    field :artifact_url,               :string, description: "the URL of the artifact"
    field :artifact_repo_url,          :string, description: "the Git URL of the codebase defining this artifact"
    field :artifact_language,          :agent_run_language, description: "the language the artifact is written in"
    field :artifact_language_version,  :string, description: "the language version of the artifact, if applicable"
    field :agent_runtime,              :string, description: "the agent runtime to use with this vulnerability report"
    field :os,                         :vuln_os
    field :summary,                    :vuln_summary
    field :artifact,                   :vuln_artifact
    field :grade,                      :vuln_report_grade, description: "the grade of the vulnerability report"

    field :vulnerabilities, list_of(:vulnerability), resolve: dataloader(Deployments)
    field :services,        list_of(:service_vuln), resolve: dataloader(Deployments)
    field :namespaces,      list_of(:namespace_vuln), resolve: dataloader(Deployments)

    timestamps()
  end

  object :vuln_os do
    field :eosl,   :boolean
    field :family, :string
    field :name,   :string
  end

  object :kubernetes_reference do
    field :group,     :string
    field :version,   :string
    field :kind,      :string
    field :name,      :string
    field :namespace, :string
  end

  object :vuln_summary do
    field :critical_count, :integer
    field :high_count,     :integer
    field :medium_count,   :integer
    field :low_count,      :integer
    field :unknown_count,  :integer
    field :none_count,     :integer
  end

  object :vuln_artifact do
    field :registry,   :string
    field :repository, :string
    field :digest,     :string
    field :tag,        :string
    field :mime,       :string
  end

  object :vulnerability do
    field :id,                non_null(:id)
    field :resource,          :string
    field :fixed_version,     :string
    field :installed_version, :string
    field :severity,          :vuln_severity
    field :agent_runtime,     :string
    field :score,             :float

    field :title,            :string
    field :description,      :string
    field :cvss_source,      :string
    field :primary_link,     :string
    field :links,            list_of(:string)
    field :target,           :string
    field :class,            :string
    field :package_type,     :string
    field :pkg_path,         :string
    field :vuln_id,          :string

    field :published_date,     :datetime
    field :last_modified_date, :datetime

    field :cvss, :cvss_bundle

    timestamps()
  end

  object :cvss_bundle do
    field :attack_vector,       :vuln_attack_vector
    field :attack_complexity,   :vuln_severity
    field :privileges_required, :vuln_severity
    field :user_interaction,    :vuln_user_interaction
    field :confidentiality,     :vuln_severity
    field :integrity,           :vuln_severity
    field :availability,        :vuln_severity

    field :nvidia, :cvss
    field :redhat, :cvss
  end

  object :cvss do
    field :v2_vector,  :string
    field :v3_vector,  :string
    field :v40_vector, :string
    field :v2_score,   :float
    field :v3_score,   :float
    field :v40_score,  :float
  end

  object :service_vuln do
    field :service, :service_deployment, resolve: dataloader(Deployments)
  end

  object :namespace_vuln do
    field :namespace, non_null(:string)
  end

  object :vulnerability_statistic do
    field :grade, non_null(:vuln_report_grade)
    field :count, non_null(:integer)
  end

  object :cluster_vuln_aggregate do
    field :cluster, :cluster, resolve: fn
      %{cluster_id: id}, _, %{context: %{loader: loader}} ->
        manual_dataloader(loader, Console.GraphQl.Resolvers.ClusterLoader, :pipeline, id)
    end
    field :count,   non_null(:integer)
  end

  object :compliance_reports do
    field :id,   non_null(:id)
    field :name, non_null(:string)
    field :sha256, :string

    timestamps()
  end

  object :compliance_report_generator do
    field :id,       non_null(:id)
    field :name,     non_null(:string)
    field :format,   non_null(:compliance_report_format)

    field :read_bindings, list_of(:policy_binding), resolve: dataloader(Deployments), description: "download policy for this report"

    connection field :compliance_reports, node_type: :compliance_reports do
      resolve &Deployments.list_compliance_reports/3
    end

    timestamps()
  end

  connection node_type: :policy
  connection node_type: :binding_policy
  connection node_type: :policy_attachment
  connection node_type: :policy_evaluation
  connection node_type: :policy_constraint
  connection node_type: :vulnerability_report
  connection node_type: :compliance_reports
  connection node_type: :compliance_report_generator

  object :policy_queries do
    field :policy, :policy do
      middleware Authenticated
      middleware Nested, enforce: true
      arg :id,   :id
      arg :name, :string

      resolve &Deployments.resolve_policy/2
    end

    connection field :policies, node_type: :policy do
      middleware Authenticated
      middleware Nested, enforce: true
      arg :project_id, :id, description: "filter policies by project"
      arg :q,          :string, description: "filter policies by name"

      resolve &Deployments.list_policies/2
    end

    field :binding_policy, :binding_policy do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.resolve_binding_policy/2
    end

    connection field :binding_policies, node_type: :binding_policy do
      middleware Authenticated

      resolve &Deployments.list_binding_policies/2
    end

    @desc "Evaluates a policy against the supplied tool input."
    field :evaluate_policy, :map do
      middleware Authenticated
      middleware Scope,
        resource: :policy,
        action: :read
      arg :policy_id, non_null(:id), description: "policy to evaluate"
      arg :input, non_null(:json), description: "JSON-encoded tool input to evaluate"

      resolve &Deployments.evaluate_policy/2
    end

    connection field :policy_constraints, node_type: :policy_constraint do
      middleware Authenticated
      arg :kind,       :string
      arg :namespace,  :string
      arg :kinds,      list_of(:string)
      arg :namespaces, list_of(:string)
      arg :clusters,   list_of(:id)
      arg :violated,   :boolean
      arg :q,          :string

      resolve &Deployments.list_policy_constraints/2
    end

    connection field :vulnerability_reports, node_type: :vulnerability_report do
      middleware Authenticated
      arg :clusters,   list_of(:id)
      arg :namespaces, list_of(:string)
      arg :q,          :string
      arg :grade,      :vuln_report_grade

      resolve &Deployments.list_vulnerabilities/2
    end

    field :violation_statistics, list_of(:violation_statistic) do
      middleware Authenticated
      arg :field, non_null(:constraint_violation_field)

      resolve &Deployments.violation_statistics/2
    end

    field :policy_statistics, list_of(:policy_statistic) do
      middleware Authenticated
      arg :aggregate, non_null(:policy_aggregate)
      arg :kind,       :string
      arg :namespace,  :string
      arg :kinds,      list_of(:string)
      arg :namespaces, list_of(:string)
      arg :clusters,   list_of(:id)
      arg :q,          :string

      resolve &Deployments.policy_statistics/2
    end

    field :policy_constraint, :policy_constraint do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.resolve_policy_constraint/2
    end

    field :vulnerability_report, :vulnerability_report do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.resolve_vulnerability/2
    end

    field :vulnerability_statistics, list_of(:vulnerability_statistic) do
      middleware Authenticated
      arg :clusters,   list_of(:id)
      arg :namespaces, list_of(:string)
      arg :q,          :string

      resolve &Deployments.vulnerability_statistics/2
    end

    field :cluster_vulnerability_aggregate, list_of(:cluster_vuln_aggregate) do
      middleware Authenticated
      arg :grade, non_null(:vuln_report_grade)

      resolve &Deployments.cluster_vuln_aggregate/2
    end

    connection field :compliance_reports, node_type: :compliance_reports do
      middleware Authenticated

      resolve &Deployments.list_compliance_reports/2
    end

    connection field :compliance_report_generators, node_type: :compliance_report_generator do
      middleware Authenticated

      resolve &Deployments.list_compliance_report_generators/2
    end

    field :compliance_report_generator, :compliance_report_generator do
      middleware Authenticated
      arg :id,   :id
      arg :name, :string

      resolve &Deployments.resolve_compliance_report_generator/2
    end
  end

  object :public_policy_mutations do
    field :upsert_policy_constraints, :integer do
      middleware ClusterAuthenticated
      arg :constraints, list_of(:policy_constraint_attributes)

      resolve &Deployments.upsert_policy_constraints/2
    end

    field :upsert_vulnerabilities, :integer do
      middleware ClusterAuthenticated
      arg :vulnerabilities, list_of(:vulnerability_report_attributes)

      resolve &Deployments.upsert_vulnerabilities/2
    end

    field :upsert_compliance_report_generator, :compliance_report_generator do
      middleware Authenticated
      arg :attributes, non_null(:compliance_report_generator_attributes)

      resolve &Deployments.upsert_compliance_report_generator/2
    end

    field :delete_compliance_report_generator, :compliance_report_generator do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.delete_compliance_report_generator/2
    end
  end

  object :policy_mutations do
    @desc "Creates a policy in a project. Requires policy write scope and write access to the target project."
    field :create_policy, :policy do
      middleware Authenticated
      middleware Scope,
        resource: :policy,
        action: :write
      arg :attributes, non_null(:policy_attributes)

      resolve &Deployments.create_policy/2
    end

    @desc "Updates a project-scoped policy. Requires policy write scope and write access to the policy's project."
    field :update_policy, :policy do
      middleware Authenticated
      middleware Scope,
        resource: :policy,
        action: :write
      arg :id,         non_null(:id)
      arg :attributes, non_null(:policy_attributes)

      resolve &Deployments.update_policy/2
    end

    @desc "Deletes a project-scoped policy. Requires policy write scope and write access to the policy's project."
    field :delete_policy, :policy do
      middleware Authenticated
      middleware Scope,
        resource: :policy,
        action: :write
      arg :id, non_null(:id)

      resolve &Deployments.delete_policy/2
    end

    field :create_binding_policy, :binding_policy do
      middleware Authenticated
      middleware Scope,
        resource: :policy,
        action: :write
      arg :attributes, non_null(:binding_policy_attributes)

      resolve &Deployments.create_binding_policy/2
    end

    field :update_binding_policy, :binding_policy do
      middleware Authenticated
      middleware Scope,
        resource: :policy,
        action: :write
      arg :id,         non_null(:id)
      arg :attributes, non_null(:binding_policy_update_attributes)

      resolve &Deployments.update_binding_policy/2
    end

    field :delete_binding_policy, :binding_policy do
      middleware Authenticated
      middleware Scope,
        resource: :policy,
        action: :write
      arg :id, non_null(:id)

      resolve &Deployments.delete_binding_policy/2
    end
  end
end
