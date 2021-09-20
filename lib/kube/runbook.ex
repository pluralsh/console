defmodule Kube.Runbook do
  use Kazan.Model

  defmodule PathUpdate do
    use Kazan.Model

    defmodel "PathUpdate", "platform.plural.sh", "v1alpha1" do
      property :path,       "path", {:array, :string}
      property :value_from, "valueFrom", :string
    end
  end

  defmodule ConfigurationAction do
    use Kazan.Model
    alias Kube.Runbook.PathUpdate

    defmodel "ConfigurationAction", "platform.plural.sh", "v1alpha1" do
      property :updates, "updates", {:array, PathUpdate}
    end
  end

  defmodule Action do
    use Kazan.Model
    alias Kube.Runbook.ConfigurationAction

    defmodel "RunbookAction", "platform.plural.sh", "v1alpha1" do
      property :name,   "name", :string
      property :action, "action", :string
      property :configuration, "configuration", ConfigurationAction
    end
  end

  defmodule Kubernetes do
    use Kazan.Model

    defmodel "KubernetesDatasoource", "platform.plural.sh", "v1alpha1" do
      property :resource, "resource", :string
      property :name,     "name", :string
    end
  end

  defmodule Prometheus do
    use Kazan.Model

    defmodel "PrometheusDatasource", "platform.plural.sh", "v1alpha1" do
      property :query, "query", :string
    end
  end

  defmodule Datasource do
    use Kazan.Model
    alias Kube.Runbook.{Prometheus, Kubernetes}

    defmodel "RunbookDatasource", "platform.plural.sh", "v1alpha1" do
      property :name, "name", :string
      property :type, "type", :string
      property :prometheus, "prometheus", Prometheus
      property :kubernetes, "kubernetes", Kubernetes
    end
  end

  defmodule Spec do
    use Kazan.Model
    alias Kube.Runbook.{Datasource, Action}

    defmodel "RunbookSpec", "platform.plural.sh", "v1alpha1" do
      property :name,        "name", :string
      property :description, "description", :string
      property :display,     "display", :string
      property :datasources, "datasources", {:array, Action}
      property :actions,     "actions", {:array, Datasource}
    end
  end

  defmodel "Runbook", "platform.plural.sh", "v1alpha1" do
    property :spec, "spec", Spec
  end
end

defmodule Kube.RunbookList do
  use Kazan.Model

  defmodellist "RunbookList",
               "platform.plural.sh",
               "v1alpha1",
               Kube.Runbook
end
