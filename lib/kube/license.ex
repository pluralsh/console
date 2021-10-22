defmodule Kube.License do
  use Kazan.Model

  defmodule Spec do
    use Kazan.Model

    defmodel "LicenseSpec", "platform.plural.sh", "v1alpha1" do
      property :secret_ref, "secretRef", Kazan.Apis.Core.V1.SecretKeySelector
    end
  end

  defmodule Feature do
    use Kazan.Model

    defmodel "LicenseFeature", "platform.plural.sh", "v1alpha1" do
      property :name,        "name",        :string
      property :description, "description", :string
    end
  end

  defmodule Status do
    use Kazan.Model

    defmodel "LicenseStatus", "platform.plural.sh", "v1alpha1" do
      property :free,     "free",     :boolean
      property :secrets,  "secrets",  :object
      property :features, "features", {:array, Kube.License.Feature}
      property :limits,   "limits",   :object
      property :plan,     "plan",     :string
    end
  end

  defmodel "License", "platform.plural.sh", "v1alpha1" do
    property :spec,   "spec",   Spec
    property :status, "status", Status
  end
end

defmodule Kube.LicenseList do
  use Kazan.Model

  defmodellist "LicenseList",
               "platform.plural.sh",
               "v1alpha1",
               Kube.License
end
