defmodule Kube.LogFilter do
  use Kazan.Model

  defmodule Label do
    use Kazan.Model

    defmodel "LogLabel", "platform.plural.sh", "v1alpha1" do
      property :name, "name", :string
      property :value, "value", :string
    end
  end

  defmodule Spec do
    use Kazan.Model
    alias Kube.LogFilter

    defmodel "LogSpec", "platform.plural.sh", "v1alpha1" do
      property :name, "name", :string
      property :description, "description", :string
      property :query, "query", :string
      property :labels, "labels", {:array, LogFilter.Label}
    end
  end

  defmodel "LogFilter", "platform.plural.sh", "v1alpha1" do
    property :spec,   "spec", Spec
  end
end

defmodule Kube.LogFilterList do
  use Kazan.Model

  defmodellist "LogFilterList",
               "platform.plural.sh",
               "v1alpha1",
               Kube.LogFilter
end
