defmodule Console.GraphQl.Runbooks do
  use Console.GraphQl.Schema.Base
  alias Console.Middleware.{Authenticated}
  alias Console.GraphQl.Resolvers.Runbooks
  alias Kazan.Apis.Apps.V1, as: AppsV1

  input_object :runbook_action_input do
    field :action,  non_null(:string)
    field :context, non_null(:map)
  end

  input_object :runbook_context do
    field :timeseries_start,  :integer
    field :timeseries_step,   :string
  end

  object :runbook do
    field :name, non_null(:string), resolve: fn
      %{metadata: %{name: name}}, _, _ -> {:ok, name}
    end

    field :spec,   non_null(:runbook_spec)
    field :status, :runbook_status

    field :data, list_of(:runbook_data) do
       arg :context, :runbook_context
       resolve &Runbooks.datasources/2
    end
  end

  object :runbook_status do
    field :alerts, list_of(:runbook_alert_status)
  end

  object :runbook_alert_status do
    field :name,        non_null(:string)
    field :starts_at,   :string
    field :fingerprint, :string
    field :annotations, :map
    field :labels,      :map
  end

  object :runbook_spec do
    field :name,        non_null(:string)
    field :description, :string

    field :display, :map, resolve: fn
      %{display: disp}, _, _ -> Console.Runbooks.Display.parse_doc(disp)
    end

    field :datasources, list_of(:runbook_datasource)
    field :actions,     list_of(:runbook_action)
  end

  object :runbook_action do
    field :name, non_null(:string)
    field :type, non_null(:string)
    field :configuration, :configuration_action
  end

  object :runbook_datasource do
    field :name, non_null(:string)
    field :type, non_null(:string)
    field :prometheus, :prometheus_datasource
    field :kubernetes, :kubernetes_datasource
  end

  object :prometheus_datasource do
    field :query,  non_null(:string)
    field :format, :string
    field :legend, :string
  end

  object :kubernetes_datasource do
    field :resource, non_null(:string)
    field :name,     non_null(:string)
  end

  object :runbook_data do
    field :name,       non_null(:string)
    field :source,     :runbook_datasource
    field :kubernetes, :kubernetes_data
    field :prometheus, list_of(:metric_response)
    field :nodes,      list_of(:node)
  end

  union :kubernetes_data do
    description "supported kubernetes objects fetchable in runbooks"

    types [:deployment, :stateful_set]
    resolve_type fn
      %AppsV1.Deployment{}, _ -> :deployment
      %AppsV1.StatefulSet{}, _ -> :stateful_set
    end
  end

  object :configuration_action do
    field :updates, list_of(:path_update)
  end

  object :path_update do
    field :path,       list_of(:string)
    field :value_from, non_null(:string)
  end

  object :runbook_action_response do
    field :redirect_to, :string
  end

  object :runbook_queries do
    field :runbook, :runbook do
      middleware Authenticated
      arg :namespace, non_null(:string)
      arg :name,      non_null(:string)

      resolve &Runbooks.resolve_runbook/2
    end

    field :runbooks, list_of(:runbook) do
      middleware Authenticated
      arg :namespace, non_null(:string)
      arg :pinned,    :boolean

      resolve &Runbooks.list_runbooks/2
    end
  end

  object :runbook_mutations do
    field :execute_runbook, :runbook_action_response do
      middleware Authenticated
      arg :namespace, non_null(:string)
      arg :name,      non_null(:string)
      arg :input,     non_null(:runbook_action_input)

      resolve &Runbooks.execute_runbook/2
    end
  end
end
