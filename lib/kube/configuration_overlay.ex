defmodule Kube.ConfigurationOverlay do
  use Kazan.Model

  defmodule OverlayUpdate do
    use Kazan.Model

    defmodel "OverlayUpdate", "platform.plural.sh", "v1alpha1" do
      property :path, "path", {:array, :string}
    end
  end

  defmodule Spec do
    use Kazan.Model

    defmodel "ConfigurationOverlaySpec", "platform.plural.sh", "v1alpha1" do
      property :name,          "name",          :string
      property :documentation, "documentation", :string
      property :updates,       "updates",       {:array, Kube.ConfigurationOverlay.OverlayUpdate}
    end
  end

  defmodel "ConfigurationOverlay", "platform.plural.sh", "v1alpha1" do
    property :spec, "spec", Spec
  end
end

defmodule Kube.ConfigurationOverlayList do
  use Kazan.Model

  defmodellist "ConfigurationOverlayList",
               "platform.plural.sh",
               "v1alpha1",
               Kube.ConfigurationOverlay
end
