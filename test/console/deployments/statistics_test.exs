defmodule Console.Deployments.StatisticsTest do
  use Console.DataCase, async: true
  alias Console.Deployments.Statistics

  describe "#info/0" do
    test "returns the correct information" do
      insert_list(2, :cluster)
      insert_list(3, :service)

      info =  Statistics.info()

      assert info.clusters == 5 # each service has one cluster created too
      assert info.services == 3
    end
  end
end
