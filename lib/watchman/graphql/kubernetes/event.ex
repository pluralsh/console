defmodule Watchman.GraphQl.Kubernetes.Event do
  use Watchman.GraphQl.Schema.Base

  object :event do
    field :action,         :string
    field :count,          :integer
    field :event_time,     :string
    field :last_timestamp, :string
    field :message,        :string
    field :reason,         :string
    field :type,           :string
  end
end