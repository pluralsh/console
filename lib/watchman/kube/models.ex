defmodule Watchman.Kube.Dashboard do
  use Kazan.Model

  defmodule Query do
    use Kazan.Model

    defmodel "Query", "forgelabs.sh", "v1alpha1" do
      property :query,         "query",  :string
      property :legend,        "legend", :string
      property :legend_format, "legendFormat", :string
    end
  end

  defmodule Graph do
    use Kazan.Model

    defmodel "Query", "forgelabs.sh", "v1alpha1" do
      property :queries, "queries", {:array, Watchman.Kube.Dashboard.Query}
      property :name,    "name",    :string
      property :format,  "format",  :string
    end
  end

  defmodule Label do
    use Kazan.Model

    defmodel "Label", "forgelabs.sh", "v1alpha1" do
      property :query,  "query",  Watchman.Kube.Dashboard.LabelQuery
      property :name,   "name",   :string
      property :values, "values", {:array, :string}
    end
  end

  defmodule LabelQuery do
    use Kazan.Model

    defmodel "Label", "forgelabs.sh", "v1alpha1" do
      property :query, "query", :string
      property :label, "label", :string
    end
  end

  defmodule Spec do
    use Kazan.Model

    defmodel "DashboardSpec", "forgelabs.sh", "v1alpha1" do
      property :name,         "name",        :string
      property :description,  "description", :string
      property :default_time, "defaultTime", :string
      property :timeslices,   "timeslices",  {:array, :string}
      property :labels,       "labels",      {:array, Watchman.Kube.Dashboard.Label}
      property :graphs,       "graphs",      {:array, Watchman.Kube.Dashboard.Graph}
    end
  end

  defmodel "Dashboard", "forgelabs.sh", "v1alpha1" do
    property :spec, "spec", Spec
  end
end

defmodule Watchman.Kube.DashboardList do
  use Kazan.Model

  defmodellist "DashboardList",
               "forgelabs.sh",
               "v1alpha1",
               Watchman.Kube.Dashboard
end