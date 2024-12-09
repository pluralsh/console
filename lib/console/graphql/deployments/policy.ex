defmodule Console.GraphQl.Deployments.Policy do
  use Console.GraphQl.Schema.Base
  alias Console.GraphQl.Resolvers.Deployments

  ecto_enum :constraint_enforcement, Console.Schema.PolicyConstraint.Enforcement
  ecto_enum :vuln_severity, Console.Schema.Vulnerability.Severity
  ecto_enum :vuln_report_grade, Console.Schema.VulnerabilityReport.Grade

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
    field :artifact_url, :string
    field :os,           :vuln_os_attributes
    field :summary,      :vuln_summary_attributes
    field :artifact,     :vuln_artifact_attributes

    field :vulnerabilities, list_of(:vulnerability_attributes)
    field :services,        list_of(:service_vuln_attributes)
    field :namespaces,      list_of(:namespace_vuln_attributes)
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

    field :title,            :string
    field :description,      :string
    field :cvss_source,      :string
    field :primary_link,     :string
    field :links,            list_of(:string)
    field :target,           :string
    field :class,            :string
    field :package_type,     :string
    field :pkg_path,         :string

    field :published_date,     :datetime
    field :last_modified_date, :datetime

    field :cvss, :cvss_attributes
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
    field :id,           non_null(:id)
    field :artifact_url, :string
    field :os,           :vuln_os
    field :summary,      :vuln_summary
    field :artifact,     :vuln_artifact

    field :vulnerabilities, list_of(:vulnerability)
    field :services,        list_of(:service_vuln)
    field :namespaces,      list_of(:namespace_vuln)

    timestamps()
  end

  object :vuln_os do
    field :eosl,   :boolean
    field :family, :string
    field :name,   :string
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

    field :published_date,     :datetime
    field :last_modified_date, :datetime

    field :cvss, :cvss

    timestamps()
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
    field :service, :service, resolve: dataloader(Deployments)
  end

  object :namespace_vuln do
    field :namespace, non_null(:string)
  end

  object :vulnerability_statistic do
    field :grade, non_null(:vuln_report_grade)
    field :count, non_null(:integer)
  end

  connection node_type: :policy_constraint
  connection node_type: :vulnerability_report

  object :policy_queries do
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
  end
end
