defmodule Console.GraphQl.Deployments.Notification do
  use Console.GraphQl.Schema.Base
  alias Console.GraphQl.Resolvers.{Deployments}
  alias Console.Schema.NotificationSink

  ecto_enum :sink_type, NotificationSink.Type

  input_object :notification_sink_attributes do
    field :name,          non_null(:string), description: "the name of this sink"
    field :type,          non_null(:sink_type), description: "the channel type of this sink"
    field :configuration, non_null(:sink_configuration_attributes), description: "configuration for the specific type"
  end

  input_object :sink_configuration_attributes do
    field :slack, :url_sink_attributes
    field :teams, :url_sink_attributes
  end

  input_object :url_sink_attributes do
    field :url, non_null(:string)
  end

  input_object :notification_router_attributes do
    field :name,         non_null(:string), description: "the name of this router"
    field :events,       list_of(non_null(:string)), description: "the events to trigger, or use * for any"
    field :filters,      list_of(:router_filter_attributes), description: "filters by object type"
    field :router_sinks, list_of(:router_sink_attributes), description: "sinks to deliver notifications to"
  end

  input_object :router_filter_attributes do
    field :regex,       :string, description: "a regex for filtering by things like pr url"
    field :service_id,  :id, description: "whether to enable delivery for events associated with this service"
    field :cluster_id,  :id, description: "whether to enable delivery for events associated with this cluster"
    field :pipeline_id, :id, description: "whether to enable delivery for events associated with this pipeline"
  end

  input_object :router_sink_attributes do
    field :sink_id, non_null(:id)
  end

  object :notification_sink do
    field :id,   non_null(:id)
    field :name, non_null(:string), description: "the name of the sink"
    field :type, non_null(:sink_type), description: "the channel type of the sink, eg slack or teams"

    field :configuration, non_null(:sink_configuration), description: "type specific sink configuration"

    timestamps()
  end

  object :notification_router do
    field :id,      non_null(:id)
    field :name,    non_null(:string), description: "name of this router"
    field :events,  list_of(non_null(:string)), description: "events this router subscribes to, use * for all"
    field :filters, list_of(:notification_filter), resolve: dataloader(Deployments), description: "resource-based filters to select events for services, clusters, pipelines"
    field :sinks,   list_of(:notification_sink), resolve: dataloader(Deployments), description: "sinks to deliver notifications to"

    timestamps()
  end

  object :notification_filter do
    field :id,       non_null(:id)
    field :regex,    :string
    field :service,  :service, resolve: dataloader(Deployments)
    field :cluster,  :cluster, resolve: dataloader(Deployments)
    field :pipeline, :pipeline, resolve: dataloader(Deployments)
  end

  object :sink_configuration do
    field :id,    non_null(:id)
    field :slack, :url_sink_configuration
    field :teams, :url_sink_configuration
  end

  @desc "A notification sink based off slack incoming webhook urls"
  object :url_sink_configuration do
    field :url, non_null(:string), description: "incoming webhook url to deliver to"
  end

  connection node_type: :notification_sink
  connection node_type: :notification_router

  object :notification_queries do
    field :notification_sink, :notification_sink do
      middleware Authenticated
      arg :name, :string
      arg :id,   :id

      resolve &Deployments.resolve_sink/2
    end

    field :notification_router, :notification_router do
      middleware Authenticated
      arg :name, :string
      arg :id,   :id

      resolve &Deployments.resolve_router/2
    end

    connection field :notification_sinks, node_type: :notification_sink do
      middleware Authenticated

      resolve &Deployments.list_sinks/2
    end

    connection field :notification_routers, node_type: :notification_sink do
      middleware Authenticated

      resolve &Deployments.list_routers/2
    end
  end

  object :notification_mutations do
    field :upsert_notification_sink, :notification_sink do
      middleware Authenticated
      arg :attributes, non_null(:notification_sink_attributes)

      resolve &Deployments.upsert_sink/2
    end

    field :upsert_notification_router, :notification_router do
      middleware Authenticated
      arg :attributes, non_null(:notification_router_attributes)

      resolve &Deployments.upsert_router/2
    end

    field :delete_notification_sink, :notification_sink do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.delete_sink/2
    end

    field :delete_notification_router, :notification_router do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.delete_router/2
    end
  end
end
