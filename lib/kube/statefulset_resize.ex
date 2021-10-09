defmodule Kube.StatefulSetResize do
  use Kazan.Model

  defmodule Spec do
    use Kazan.Model

    defmodel  "StatefulSetResizeSpec", "platform.plural.sh", "v1alpha1" do
      property :name,              "name", :string
      property :persistent_volume, "persistentVolume", :string
      property :size,              "size", :string
    end
  end

  defmodel "StatefulSetResize", "platform.plural.sh", "v1alpha1" do
    property :spec, "spec", Spec
  end
end
