defmodule Kube.Condition do
  use Kazan.Model

  defmodel "Condition", "", "v1" do
    property :message,  "message", :string
    property :reason,   "reason",  :string
    property :status,   "status",  :string
    property :type,     "type",    :string
  end
end
