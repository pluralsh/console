defmodule Console.GraphQl.Kubernetes.License do
  use Console.GraphQl.Schema.Base

  object :license do
    field :metadata, non_null(:metadata)
    field :spec,     non_null(:license_spec)
    field :status,   :license_status, resolve: fn
      %{status: %{policy: policy}}, _, _ -> {:ok, policy}
      _, _, _ -> {:ok, nil}
    end
  end

  object :license_spec do
    field :secret_ref,  non_null(:secret_key_selector)
  end

  object :license_status do
    field :plan,     :string
    field :free,     :boolean
    field :features, list_of(:license_feature)
    field :limits,   :map
    field :secrets,  :map
  end

  object :license_feature do
    field :name,        non_null(:string)
    field :description, :string
  end
end
