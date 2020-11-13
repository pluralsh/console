defmodule Watchman.GraphQl.Kubernetes.LogFilter do
  use Watchman.GraphQl.Schema.Base

  object :log_filter do
    field :metadata, non_null(:metadata)
    field :spec, non_null(:log_filter_spec)
  end

  object :log_filter_spec do
    field :query, :string
    field :labels, list_of(:log_label)
  end
end