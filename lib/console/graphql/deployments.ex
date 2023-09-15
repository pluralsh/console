defmodule Console.GraphQl.Deployments do
  use Console.GraphQl.Schema.Base

  import_types Console.GraphQl.Deployments.Git
  import_types Console.GraphQl.Deployments.Cluster
  import_types Console.GraphQl.Deployments.Service

  object :deployment_queries do
    import_fields :git_queries
    import_fields :cluster_queries
    import_fields :service_queries
  end

  object :deployment_mutations do
    import_fields :git_mutations
    import_fields :cluster_mutations
    import_fields :service_mutations
  end
end
