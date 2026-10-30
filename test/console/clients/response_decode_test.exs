defmodule Console.Clients.ResponseDecodeTest do
  use ExUnit.Case, async: true

  describe "Prometheus.Response.decode/1" do
    test "it builds series results" do
      body = ~s({"status":"success","data":{"resultType":"matrix","result":[
        {"metric":{"pod":"a"},"values":[[1700000000,"1.5"]]}
      ]}})

      assert {:ok, %Prometheus.Response{
        status: "success",
        data: %Prometheus.Data{resultType: "matrix", result: [
          %Prometheus.Result{metric: %{"pod" => "a"}, values: [[1700000000, "1.5"]], value: nil}
        ]}
      }} = Prometheus.Response.decode(body)
    end

    test "it leaves scalar results as a bare pair" do
      body = ~s({"status":"success","data":{"resultType":"scalar","result":[1700000000,"2"]}})

      assert {:ok, %Prometheus.Response{data: %Prometheus.Data{result: [1700000000, "2"]}}} =
        Prometheus.Response.decode(body)
    end

    test "it errors on invalid json" do
      assert {:error, _} = Prometheus.Response.decode("{bad")
    end
  end

  describe "Loki.Response.decode/1" do
    test "it builds stream results" do
      body = ~s({"status":"success","data":{"resultType":"streams","result":[
        {"stream":{"app":"console"},"values":[["1700000000000000000","a line"]]}
      ]}})

      assert {:ok, %Loki.Response{data: %Loki.Data{result: [
        %Loki.Result{stream: %{"app" => "console"}, values: [["1700000000000000000", "a line"]]}
      ]}}} = Loki.Response.decode(body)
    end
  end
end
