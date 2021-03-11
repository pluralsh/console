defmodule Kube.SlashCommand do
  use Kazan.Model

  defmodule Spec do
    use Kazan.Model

    defmodel "SlashCommandSpec", "forgelabs.sh", "v1alpha1" do
      property :type, "type", :string
    end
  end

  defmodel "SlashCommand", "forgelabs.sh", "v1alpha1" do
    property :spec, "spec", Spec
  end
end

defmodule Kube.SlashCommandList do
  use Kazan.Model

  defmodellist "SlashCommandList",
               "forgelabs.sh",
               "v1alpha1",
               Kube.SlashCommand
end
