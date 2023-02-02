defmodule Console.GraphQl.PluralQueriesTest do
  use Console.DataCase, async: true
  use Mimic
  import KubernetesScaffolds
  alias Console.Plural.Queries
  alias Kube.{Application, ApplicationList}

  @kubecost """
  {"code":200,"data":[{"__idle__":{"name":"__idle__","properties":{"cluster":"cluster-one"},"window":{"start":"2021-09-10T16:00:00Z","end":"2021-09-10T19:00:00Z"},"start":"2021-09-10T16:00:00Z","end":"2021-09-10T18:50:00Z","minutes":170.000000,"cpuCores":0.000000,"cpuCoreRequestAverage":0.000000,"cpuCoreUsageAverage":0.000000,"cpuCoreHours":0.000000,"cpuCost":0.039245,"cpuCostAdjustment":0.000000,"cpuEfficiency":0.000000,"gpuCount":0.000000,"gpuHours":0.000000,"gpuCost":0.000000,"gpuCostAdjustment":0.000000,"networkTransferBytes":0.000000,"networkReceiveBytes":0.000000,"networkCost":0.000000,"networkCostAdjustment":0.000000,"loadBalancerCost":0.000000,"loadBalancerCostAdjustment":0.000000,"pvBytes":0.000000,"pvByteHours":0.000000,"pvCost":0.000000,"pvs":null,"pvCostAdjustment":0.000000,"ramBytes":0.000000,"ramByteRequestAverage":0.000000,"ramByteUsageAverage":0.000000,"ramByteHours":0.000000,"ramCost":0.261633,"ramCostAdjustment":0.000000,"ramEfficiency":0.000000,"sharedCost":0.000000,"externalCost":0.000000,"totalCost":0.300878,"totalEfficiency":0.000000,"rawAllocationOnly":null},"airflow":{"name":"airflow","properties":{"cluster":"cluster-one","controller":"airflow-redis-master","namespace":"airflow"},"window":{"start":"2021-09-09T19:00:00Z","end":"2021-09-10T19:00:00Z"},"start":"2021-09-09T19:00:00Z","end":"2021-09-10T18:50:00Z","minutes":1430.000000,"cpuCores":2.710000,"cpuCoreRequestAverage":2.710000,"cpuCoreUsageAverage":0.313527,"cpuCoreHours":64.588333,"cpuCost":2.027878,"cpuCostAdjustment":-0.000000,"cpuEfficiency":0.115692,"gpuCount":0.000000,"gpuHours":0.000000,"gpuCost":0.000000,"gpuCostAdjustment":0.000000,"networkTransferBytes":0.000000,"networkReceiveBytes":0.000000,"networkCost":0.000000,"networkCostAdjustment":0.000000,"loadBalancerCost":0.000000,"loadBalancerCostAdjustment":0.000000,"pvBytes":3191190735.664336,"pvByteHours":76056712533.333344,"pvCost":0.009703,"pvs":null,"pvCostAdjustment":-0.000000,"ramBytes":5611978752.000000,"ramByteRequestAverage":5611978752.000000,"ramByteUsageAverage":3579257977.925439,"ramByteHours":133752160256.000000,"ramCost":0.524389,"ramCostAdjustment":-0.000000,"ramEfficiency":0.637789,"sharedCost":0.000000,"externalCost":0.000000,"totalCost":2.561970,"totalEfficiency":0.222962,"rawAllocationOnly":null},"argo-cd":{"name":"argo-cd","properties":{"cluster":"cluster-one","controller":"argo-cd-argocd-application-controller","namespace":"argo-cd"},"window":{"start":"2021-09-09T19:00:00Z","end":"2021-09-10T19:00:00Z"},"start":"2021-09-09T19:00:00Z","end":"2021-09-10T18:50:00Z","minutes":1430.000000,"cpuCores":0.000000,"cpuCoreRequestAverage":0.000000,"cpuCoreUsageAverage":0.029580,"cpuCoreHours":0.000000,"cpuCost":0.000000,"cpuCostAdjustment":0.000000,"cpuEfficiency":0.000000,"gpuCount":0.000000,"gpuHours":0.000000,"gpuCost":0.000000,"gpuCostAdjustment":0.000000,"networkTransferBytes":0.000000,"networkReceiveBytes":0.000000,"networkCost":0.000000,"networkCostAdjustment":0.000000,"loadBalancerCost":0.000000,"loadBalancerCostAdjustment":0.000000,"pvBytes":0.000000,"pvByteHours":0.000000,"pvCost":0.000000,"pvs":null,"pvCostAdjustment":0.000000,"ramBytes":0.000000,"ramByteRequestAverage":0.000000,"ramByteUsageAverage":314956452.425112,"ramByteHours":0.000000,"ramCost":0.000000,"ramCostAdjustment":0.000000,"ramEfficiency":0.000000,"sharedCost":0.000000,"externalCost":0.000000,"totalCost":0.000000,"totalEfficiency":0.000000,"rawAllocationOnly":null},"bootstrap":{"name":"bootstrap","properties":{"cluster":"cluster-one","controller":"bootstrap-aws-cluster-autoscaler","namespace":"bootstrap"},"window":{"start":"2021-09-09T19:00:00Z","end":"2021-09-10T19:00:00Z"},"start":"2021-09-09T19:00:00Z","end":"2021-09-10T18:50:00Z","minutes":1430.000000,"cpuCores":0.404545,"cpuCoreRequestAverage":0.404545,"cpuCoreUsageAverage":0.053713,"cpuCoreHours":9.641667,"cpuCost":0.299953,"cpuCostAdjustment":-0.000000,"cpuEfficiency":0.132773,"gpuCount":0.000000,"gpuHours":0.000000,"gpuCost":0.000000,"gpuCostAdjustment":0.000000,"networkTransferBytes":0.000000,"networkReceiveBytes":0.000000,"networkCost":0.000000,"networkCostAdjustment":0.000000,"loadBalancerCost":0.055417,"loadBalancerCostAdjustment":-0.001250,"pvBytes":0.000000,"pvByteHours":0.000000,"pvCost":0.000000,"pvs":null,"pvCostAdjustment":0.000000,"ramBytes":161576029.090909,"ramByteRequestAverage":161576029.090909,"ramByteUsageAverage":843740465.832334,"ramByteHours":3850895360.000000,"ramCost":0.014949,"ramCostAdjustment":0.000000,"ramEfficiency":5.221941,"sharedCost":0.000000,"externalCost":0.000000,"totalCost":0.369068,"totalEfficiency":0.374367,"rawAllocationOnly":null},"console":{"name":"console","properties":{"cluster":"cluster-one","controller":"console","namespace":"console"},"window":{"start":"2021-09-09T19:00:00Z","end":"2021-09-10T19:00:00Z"},"start":"2021-09-09T19:00:00Z","end":"2021-09-10T18:50:00Z","minutes":1430.000000,"cpuCores":0.200000,"cpuCoreRequestAverage":0.200000,"cpuCoreUsageAverage":0.016014,"cpuCoreHours":4.766667,"cpuCost":0.148333,"cpuCostAdjustment":-0.000000,"cpuEfficiency":0.080071,"gpuCount":0.000000,"gpuHours":0.000000,"gpuCost":0.000000,"gpuCostAdjustment":0.000000,"networkTransferBytes":0.000000,"networkReceiveBytes":0.000000,"networkCost":0.000000,"networkCostAdjustment":0.000000,"loadBalancerCost":0.000000,"loadBalancerCostAdjustment":0.000000,"pvBytes":3191190735.664336,"pvByteHours":76056712533.333344,"pvCost":0.009703,"pvs":null,"pvCostAdjustment":-0.000000,"ramBytes":209715200.000000,"ramByteRequestAverage":209715200.000000,"ramByteUsageAverage":693738655.229295,"ramByteHours":4998212266.666667,"ramCost":0.019416,"ramCostAdjustment":0.000000,"ramEfficiency":3.308004,"sharedCost":0.000000,"externalCost":0.000000,"totalCost":0.177452,"totalEfficiency":0.453683,"rawAllocationOnly":null},"ghost":{"name":"ghost","properties":{"cluster":"cluster-one","controller":"ghost","namespace":"ghost"},"window":{"start":"2021-09-09T19:00:00Z","end":"2021-09-10T19:00:00Z"},"start":"2021-09-09T19:00:00Z","end":"2021-09-10T18:50:00Z","minutes":1430.000000,"cpuCores":0.230000,"cpuCoreRequestAverage":0.230000,"cpuCoreUsageAverage":0.030209,"cpuCoreHours":5.481667,"cpuCost":0.170583,"cpuCostAdjustment":-0.000000,"cpuEfficiency":0.131345,"gpuCount":0.000000,"gpuHours":0.000000,"gpuCost":0.000000,"gpuCostAdjustment":0.000000,"networkTransferBytes":0.000000,"networkReceiveBytes":0.000000,"networkCost":0.000000,"networkCostAdjustment":0.000000,"loadBalancerCost":0.000000,"loadBalancerCostAdjustment":0.000000,"pvBytes":1276476294.265734,"pvByteHours":30422685013.333336,"pvCost":0.003881,"pvs":null,"pvCostAdjustment":0.000000,"ramBytes":1207959552.000000,"ramByteRequestAverage":1207959552.000000,"ramByteUsageAverage":572683498.843179,"ramByteHours":28789702656.000000,"ramCost":0.111835,"ramCostAdjustment":-0.000000,"ramEfficiency":0.474092,"sharedCost":0.000000,"externalCost":0.000000,"totalCost":0.286300,"totalEfficiency":0.267070,"rawAllocationOnly":null},"gitlab":{"name":"gitlab","properties":{"cluster":"cluster-one","controller":"gitlab-gitaly","namespace":"gitlab"},"window":{"start":"2021-09-09T19:00:00Z","end":"2021-09-10T19:00:00Z"},"start":"2021-09-09T19:00:00Z","end":"2021-09-10T18:50:00Z","minutes":1430.000000,"cpuCores":0.875455,"cpuCoreRequestAverage":0.875455,"cpuCoreUsageAverage":0.203283,"cpuCoreHours":20.865000,"cpuCost":0.654689,"cpuCostAdjustment":-0.000000,"cpuEfficiency":0.232203,"gpuCount":0.000000,"gpuHours":0.000000,"gpuCost":0.000000,"gpuCostAdjustment":0.000000,"networkTransferBytes":0.000000,"networkReceiveBytes":0.000000,"networkCost":0.000000,"networkCostAdjustment":0.000000,"loadBalancerCost":0.000000,"loadBalancerCostAdjustment":0.000000,"pvBytes":13785943978.069931,"pvByteHours":328564998144.000061,"pvCost":0.041918,"pvs":null,"pvCostAdjustment":-0.000000,"ramBytes":3786931485.986014,"ramByteRequestAverage":3786931485.986014,"ramByteUsageAverage":4028436403.048713,"ramByteHours":90255200416.000000,"ramCost":0.355431,"ramCostAdjustment":0.000000,"ramEfficiency":1.063773,"sharedCost":0.000000,"externalCost":0.000000,"totalCost":1.052038,"totalEfficiency":0.524807,"rawAllocationOnly":null},"grafana":{"name":"grafana","properties":{"cluster":"cluster-one","controller":"grafana","namespace":"grafana","pod":"grafana-0"},"window":{"start":"2021-09-09T19:00:00Z","end":"2021-09-10T19:00:00Z"},"start":"2021-09-09T19:00:00Z","end":"2021-09-10T18:50:00Z","minutes":1430.000000,"cpuCores":0.000000,"cpuCoreRequestAverage":0.000000,"cpuCoreUsageAverage":0.004056,"cpuCoreHours":0.000000,"cpuCost":0.000000,"cpuCostAdjustment":0.000000,"cpuEfficiency":0.000000,"gpuCount":0.000000,"gpuHours":0.000000,"gpuCost":0.000000,"gpuCostAdjustment":0.000000,"networkTransferBytes":0.000000,"networkReceiveBytes":0.000000,"networkCost":0.000000,"networkCostAdjustment":0.000000,"loadBalancerCost":0.000000,"loadBalancerCostAdjustment":0.000000,"pvBytes":1276476294.265734,"pvByteHours":30422685013.333336,"pvCost":0.003881,"pvs":null,"pvCostAdjustment":0.000000,"ramBytes":0.000000,"ramByteRequestAverage":0.000000,"ramByteUsageAverage":116042952.547931,"ramByteHours":0.000000,"ramCost":0.000000,"ramCostAdjustment":0.000000,"ramEfficiency":0.000000,"sharedCost":0.000000,"externalCost":0.000000,"totalCost":0.003881,"totalEfficiency":0.000000,"rawAllocationOnly":null},"influx":{"name":"influx","properties":{"cluster":"cluster-one","controller":"influx-chronograf","namespace":"influx"},"window":{"start":"2021-09-10T01:00:00Z","end":"2021-09-10T19:00:00Z"},"start":"2021-09-10T01:34:00Z","end":"2021-09-10T18:50:00Z","minutes":1036.000000,"cpuCores":0.949324,"cpuCoreRequestAverage":0.949324,"cpuCoreUsageAverage":0.182012,"cpuCoreHours":16.391667,"cpuCost":0.508211,"cpuCostAdjustment":-0.000000,"cpuEfficiency":0.191728,"gpuCount":0.000000,"gpuHours":0.000000,"gpuCost":0.000000,"gpuCostAdjustment":0.000000,"networkTransferBytes":0.000000,"networkReceiveBytes":0.000000,"networkCost":0.000000,"networkCostAdjustment":0.000000,"loadBalancerCost":0.000000,"loadBalancerCostAdjustment":0.000000,"pvBytes":4228635754.749035,"pvByteHours":73014444032.000000,"pvCost":0.009315,"pvs":null,"pvCostAdjustment":0.000000,"ramBytes":2346996486.918919,"ramByteRequestAverage":2346996486.918919,"ramByteUsageAverage":678263242.742882,"ramByteHours":40524806007.466667,"ramCost":0.156873,"ramCostAdjustment":-0.000000,"ramEfficiency":0.288992,"sharedCost":0.000000,"externalCost":0.000000,"totalCost":0.674399,"totalEfficiency":0.214670,"rawAllocationOnly":null},"kafka":{"name":"kafka","properties":{"cluster":"cluster-one","controller":"kafka-entity-operator","namespace":"kafka"},"window":{"start":"2021-09-09T19:00:00Z","end":"2021-09-10T19:00:00Z"},"start":"2021-09-09T19:00:00Z","end":"2021-09-10T18:50:00Z","minutes":1430.000000,"cpuCores":0.200000,"cpuCoreRequestAverage":0.200000,"cpuCoreUsageAverage":0.218545,"cpuCoreHours":4.766667,"cpuCost":0.150728,"cpuCostAdjustment":-0.000000,"cpuEfficiency":1.092727,"gpuCount":0.000000,"gpuHours":0.000000,"gpuCost":0.000000,"gpuCostAdjustment":0.000000,"networkTransferBytes":0.000000,"networkReceiveBytes":0.000000,"networkCost":0.000000,"networkCostAdjustment":0.000000,"loadBalancerCost":0.000000,"loadBalancerCostAdjustment":0.000000,"pvBytes":76588577655.944077,"pvByteHours":1825361100800.000488,"pvCost":0.232877,"pvs":null,"pvCostAdjustment":-0.000000,"ramBytes":402653184.000000,"ramByteRequestAverage":402653184.000000,"ramByteUsageAverage":4441896406.444767,"ramByteHours":9596567552.000000,"ramCost":0.037881,"ramCostAdjustment":-0.000000,"ramEfficiency":11.031569,"sharedCost":0.000000,"externalCost":0.000000,"totalCost":0.421486,"totalEfficiency":3.088878,"rawAllocationOnly":null},"kube-system":{"name":"kube-system","properties":{"cluster":"cluster-one","controller":"aws-node","namespace":"kube-system"},"window":{"start":"2021-09-09T19:00:00Z","end":"2021-09-10T19:00:00Z"},"start":"2021-09-09T19:00:00Z","end":"2021-09-10T18:50:00Z","minutes":1430.000000,"cpuCores":0.860000,"cpuCoreRequestAverage":0.860000,"cpuCoreUsageAverage":0.037765,"cpuCoreHours":20.496667,"cpuCost":0.639150,"cpuCostAdjustment":-0.000000,"cpuEfficiency":0.043913,"gpuCount":0.000000,"gpuHours":0.000000,"gpuCost":0.000000,"gpuCostAdjustment":0.000000,"networkTransferBytes":0.000000,"networkReceiveBytes":0.000000,"networkCost":0.000000,"networkCostAdjustment":0.000000,"loadBalancerCost":0.000000,"loadBalancerCostAdjustment":0.000000,"pvBytes":0.000000,"pvByteHours":0.000000,"pvCost":0.000000,"pvs":null,"pvCostAdjustment":0.000000,"ramBytes":146800640.000000,"ramByteRequestAverage":146800640.000000,"ramByteUsageAverage":514327751.075133,"ramByteHours":3498748586.666667,"ramCost":0.013591,"ramCostAdjustment":0.000000,"ramEfficiency":3.503580,"sharedCost":0.000000,"externalCost":0.000000,"totalCost":0.652741,"totalEfficiency":0.115949,"rawAllocationOnly":null},"kubecost":{"name":"kubecost","properties":{"cluster":"cluster-one","node":"ip-10-0-3-178.us-east-2.compute.internal","controller":"kubecost-cost-analyzer","controllerKind":"deployment","namespace":"kubecost","pod":"kubecost-cost-analyzer-99954bcb7-hbt4h","providerID":"i-00307640b863c9cc8"},"window":{"start":"2021-09-10T16:00:00Z","end":"2021-09-10T19:00:00Z"},"start":"2021-09-10T16:36:00Z","end":"2021-09-10T18:50:00Z","minutes":134.000000,"cpuCores":0.310000,"cpuCoreRequestAverage":0.310000,"cpuCoreUsageAverage":0.008583,"cpuCoreHours":0.692333,"cpuCost":0.019019,"cpuCostAdjustment":-0.000000,"cpuEfficiency":0.027687,"gpuCount":0.000000,"gpuHours":0.000000,"gpuCost":0.000000,"gpuCostAdjustment":0.000000,"networkTransferBytes":0.000000,"networkReceiveBytes":0.000000,"networkCost":0.000000,"networkCostAdjustment":0.000000,"loadBalancerCost":0.000000,"loadBalancerCostAdjustment":0.000000,"pvBytes":46667704350.567169,"pvByteHours":104224539716.266678,"pvCost":0.013297,"pvs":null,"pvCostAdjustment":-0.000000,"ramBytes":173015040.000000,"ramByteRequestAverage":173015040.000000,"ramByteUsageAverage":121536321.571697,"ramByteHours":386400256.000000,"ramCost":0.001325,"ramCostAdjustment":0.000000,"ramEfficiency":0.702461,"sharedCost":0.000000,"externalCost":0.000000,"totalCost":0.033641,"totalEfficiency":0.071635,"rawAllocationOnly":null},"marketing-website":{"name":"marketing-website","properties":{"cluster":"cluster-one","node":"ip-10-0-2-97.us-east-2.compute.internal","container":"marketing-website","controller":"marketing-website","namespace":"marketing-website","pod":"marketing-website-5fd5f64cd6-xrn98"},"window":{"start":"2021-09-09T19:00:00Z","end":"2021-09-10T19:00:00Z"},"start":"2021-09-09T19:00:00Z","end":"2021-09-10T18:50:00Z","minutes":1430.000000,"cpuCores":0.100000,"cpuCoreRequestAverage":0.100000,"cpuCoreUsageAverage":0.007159,"cpuCoreHours":2.383333,"cpuCost":0.074167,"cpuCostAdjustment":-0.000000,"cpuEfficiency":0.071593,"gpuCount":0.000000,"gpuHours":0.000000,"gpuCost":0.000000,"gpuCostAdjustment":0.000000,"networkTransferBytes":0.000000,"networkReceiveBytes":0.000000,"networkCost":0.000000,"networkCostAdjustment":0.000000,"loadBalancerCost":0.000000,"loadBalancerCostAdjustment":0.000000,"pvBytes":0.000000,"pvByteHours":0.000000,"pvCost":0.000000,"pvs":null,"pvCostAdjustment":0.000000,"ramBytes":134217728.000000,"ramByteRequestAverage":134217728.000000,"ramByteUsageAverage":47596679.055186,"ramByteHours":3198855850.666667,"ramCost":0.012426,"ramCostAdjustment":-0.000000,"ramEfficiency":0.354623,"sharedCost":0.000000,"externalCost":0.000000,"totalCost":0.086593,"totalEfficiency":0.112208,"rawAllocationOnly":null},"monitoring":{"name":"monitoring","properties":{"cluster":"cluster-one","controller":"alertmanager-monitoring-alertmanager","namespace":"monitoring"},"window":{"start":"2021-09-09T19:00:00Z","end":"2021-09-10T19:00:00Z"},"start":"2021-09-09T19:00:00Z","end":"2021-09-10T18:50:00Z","minutes":1430.000000,"cpuCores":0.200000,"cpuCoreRequestAverage":0.200000,"cpuCoreUsageAverage":0.820285,"cpuCoreHours":4.766667,"cpuCost":0.149531,"cpuCostAdjustment":-0.000000,"cpuEfficiency":4.101424,"gpuCount":0.000000,"gpuHours":0.000000,"gpuCost":0.000000,"gpuCostAdjustment":0.000000,"networkTransferBytes":0.000000,"networkReceiveBytes":0.000000,"networkCost":0.000000,"networkCostAdjustment":0.000000,"loadBalancerCost":0.000000,"loadBalancerCostAdjustment":0.000000,"pvBytes":3829428882.797203,"pvByteHours":91268055040.000000,"pvCost":0.011644,"pvs":null,"pvCostAdjustment":0.000000,"ramBytes":314572800.000000,"ramByteRequestAverage":314572800.000000,"ramByteUsageAverage":2885694761.992295,"ramByteHours":7497318400.000000,"ramCost":0.029516,"ramCostAdjustment":0.000000,"ramEfficiency":9.173377,"sharedCost":0.000000,"externalCost":0.000000,"totalCost":0.190691,"totalEfficiency":4.937540,"rawAllocationOnly":null},"mysql":{"name":"mysql","properties":{"cluster":"cluster-one","controller":"mysql-mysql-operator","namespace":"mysql","pod":"mysql-mysql-operator-0"},"window":{"start":"2021-09-09T19:00:00Z","end":"2021-09-10T19:00:00Z"},"start":"2021-09-09T19:00:00Z","end":"2021-09-10T18:50:00Z","minutes":1430.000000,"cpuCores":0.000000,"cpuCoreRequestAverage":0.000000,"cpuCoreUsageAverage":0.032264,"cpuCoreHours":0.000000,"cpuCost":0.000000,"cpuCostAdjustment":0.000000,"cpuEfficiency":0.000000,"gpuCount":0.000000,"gpuHours":0.000000,"gpuCost":0.000000,"gpuCostAdjustment":0.000000,"networkTransferBytes":0.000000,"networkReceiveBytes":0.000000,"networkCost":0.000000,"networkCostAdjustment":0.000000,"loadBalancerCost":0.000000,"loadBalancerCostAdjustment":0.000000,"pvBytes":127647629.426573,"pvByteHours":3042268501.333333,"pvCost":0.000388,"pvs":null,"pvCostAdjustment":0.000000,"ramBytes":0.000000,"ramByteRequestAverage":0.000000,"ramByteUsageAverage":78034794.120301,"ramByteHours":0.000000,"ramCost":0.000000,"ramCostAdjustment":0.000000,"ramEfficiency":0.000000,"sharedCost":0.000000,"externalCost":0.000000,"totalCost":0.000388,"totalEfficiency":0.000000,"rawAllocationOnly":null},"plural":{"name":"plural","properties":{"cluster":"cluster-one","controller":"chartmuseum","namespace":"plural"},"window":{"start":"2021-09-09T19:00:00Z","end":"2021-09-10T19:00:00Z"},"start":"2021-09-09T19:00:00Z","end":"2021-09-10T18:50:00Z","minutes":1430.000000,"cpuCores":0.862657,"cpuCoreRequestAverage":0.862657,"cpuCoreUsageAverage":0.079614,"cpuCoreHours":20.560000,"cpuCost":0.640538,"cpuCostAdjustment":-0.000000,"cpuEfficiency":0.092290,"gpuCount":0.000000,"gpuHours":0.000000,"gpuCost":0.000000,"gpuCostAdjustment":0.000000,"networkTransferBytes":0.000000,"networkReceiveBytes":0.000000,"networkCost":0.000000,"networkCostAdjustment":0.000000,"loadBalancerCost":0.000000,"loadBalancerCostAdjustment":0.000000,"pvBytes":19147144413.986019,"pvByteHours":456340275200.000122,"pvCost":0.058219,"pvs":null,"pvCostAdjustment":-0.000000,"ramBytes":922958061.739860,"ramByteRequestAverage":922958061.739860,"ramByteUsageAverage":1768709273.097589,"ramByteHours":21997167138.133335,"ramCost":0.085573,"ramCostAdjustment":0.000000,"ramEfficiency":1.916348,"sharedCost":0.000000,"externalCost":0.000000,"totalCost":0.784330,"totalEfficiency":0.307256,"rawAllocationOnly":null},"postgres":{"name":"postgres","properties":{"cluster":"cluster-one","node":"ip-10-0-2-97.us-east-2.compute.internal","container":"postgres","controller":"postgres-operator","namespace":"postgres","pod":"postgres-operator-9888cf48d-gf2r8"},"window":{"start":"2021-09-09T19:00:00Z","end":"2021-09-10T19:00:00Z"},"start":"2021-09-09T19:00:00Z","end":"2021-09-10T18:50:00Z","minutes":1430.000000,"cpuCores":0.100000,"cpuCoreRequestAverage":0.100000,"cpuCoreUsageAverage":0.001111,"cpuCoreHours":2.383333,"cpuCost":0.074167,"cpuCostAdjustment":-0.000000,"cpuEfficiency":0.011112,"gpuCount":0.000000,"gpuHours":0.000000,"gpuCost":0.000000,"gpuCostAdjustment":0.000000,"networkTransferBytes":0.000000,"networkReceiveBytes":0.000000,"networkCost":0.000000,"networkCostAdjustment":0.000000,"loadBalancerCost":0.000000,"loadBalancerCostAdjustment":0.000000,"pvBytes":0.000000,"pvByteHours":0.000000,"pvCost":0.000000,"pvs":null,"pvCostAdjustment":0.000000,"ramBytes":262144000.000000,"ramByteRequestAverage":262144000.000000,"ramByteUsageAverage":25847741.106492,"ramByteHours":6247765333.333333,"ramCost":0.024270,"ramCostAdjustment":0.000000,"ramEfficiency":0.098601,"sharedCost":0.000000,"externalCost":0.000000,"totalCost":0.098436,"totalEfficiency":0.032683,"rawAllocationOnly":null},"rabbitmq":{"name":"rabbitmq","properties":{"cluster":"cluster-one","controller":"rabbitmq-cluster-operator","namespace":"rabbitmq"},"window":{"start":"2021-09-09T19:00:00Z","end":"2021-09-10T19:00:00Z"},"start":"2021-09-09T19:00:00Z","end":"2021-09-10T18:50:00Z","minutes":1430.000000,"cpuCores":2.200000,"cpuCoreRequestAverage":2.200000,"cpuCoreUsageAverage":0.028061,"cpuCoreHours":52.433333,"cpuCost":1.646036,"cpuCostAdjustment":-0.000000,"cpuEfficiency":0.012755,"gpuCount":0.000000,"gpuHours":0.000000,"gpuCost":0.000000,"gpuCostAdjustment":0.000000,"networkTransferBytes":0.000000,"networkReceiveBytes":0.000000,"networkCost":0.000000,"networkCostAdjustment":0.000000,"loadBalancerCost":0.000000,"loadBalancerCostAdjustment":0.000000,"pvBytes":2552952588.531469,"pvByteHours":60845370026.666672,"pvCost":0.007763,"pvs":null,"pvCostAdjustment":0.000000,"ramBytes":2671771648.000000,"ramByteRequestAverage":2671771648.000000,"ramByteUsageAverage":310662896.215051,"ramByteHours":63677224277.333336,"ramCost":0.249749,"ramCostAdjustment":-0.000000,"ramEfficiency":0.116276,"sharedCost":0.000000,"externalCost":0.000000,"totalCost":1.903548,"totalEfficiency":0.026393,"rawAllocationOnly":null},"redis":{"name":"redis","properties":{"cluster":"cluster-one","controller":"redis-master","namespace":"redis"},"window":{"start":"2021-09-09T19:00:00Z","end":"2021-09-10T19:00:00Z"},"start":"2021-09-09T19:00:00Z","end":"2021-09-10T18:50:00Z","minutes":1430.000000,"cpuCores":0.000000,"cpuCoreRequestAverage":0.000000,"cpuCoreUsageAverage":0.042656,"cpuCoreHours":0.000000,"cpuCost":0.000000,"cpuCostAdjustment":0.000000,"cpuEfficiency":0.000000,"gpuCount":0.000000,"gpuHours":0.000000,"gpuCost":0.000000,"gpuCostAdjustment":0.000000,"networkTransferBytes":0.000000,"networkReceiveBytes":0.000000,"networkCost":0.000000,"networkCostAdjustment":0.000000,"loadBalancerCost":0.000000,"loadBalancerCostAdjustment":0.000000,"pvBytes":4084724141.650350,"pvByteHours":97352592042.666672,"pvCost":0.012420,"pvs":null,"pvCostAdjustment":0.000000,"ramBytes":0.000000,"ramByteRequestAverage":0.000000,"ramByteUsageAverage":84067786.563185,"ramByteHours":0.000000,"ramCost":0.000000,"ramCostAdjustment":0.000000,"ramEfficiency":0.000000,"sharedCost":0.000000,"externalCost":0.000000,"totalCost":0.012420,"totalEfficiency":0.000000,"rawAllocationOnly":null},"sentry":{"name":"sentry","properties":{"cluster":"cluster-one","controller":"plural-sentry","namespace":"sentry"},"window":{"start":"2021-09-09T19:00:00Z","end":"2021-09-10T19:00:00Z"},"start":"2021-09-09T19:00:00Z","end":"2021-09-10T18:50:00Z","minutes":1430.000000,"cpuCores":0.200000,"cpuCoreRequestAverage":0.200000,"cpuCoreUsageAverage":0.088756,"cpuCoreHours":4.766667,"cpuCost":0.148333,"cpuCostAdjustment":-0.000000,"cpuEfficiency":0.443778,"gpuCount":0.000000,"gpuHours":0.000000,"gpuCost":0.000000,"gpuCostAdjustment":0.000000,"networkTransferBytes":0.000000,"networkReceiveBytes":0.000000,"networkCost":0.000000,"networkCostAdjustment":0.000000,"loadBalancerCost":0.000000,"loadBalancerCostAdjustment":0.000000,"pvBytes":14679477384.055946,"pvByteHours":349860877653.333374,"pvCost":0.044635,"pvs":null,"pvCostAdjustment":-0.000000,"ramBytes":209715200.000000,"ramByteRequestAverage":209715200.000000,"ramByteUsageAverage":2928305271.859007,"ramByteHours":4998212266.666667,"ramCost":0.019416,"ramCostAdjustment":0.000000,"ramEfficiency":13.963248,"sharedCost":0.000000,"externalCost":0.000000,"totalCost":0.212384,"totalEfficiency":2.008571,"rawAllocationOnly":null}}]}
  """

  describe "installations" do
    test "It will fetch your installations from Plural" do
      body = Jason.encode!(%{
        query: Queries.installation_query(),
        variables: %{first: 5}
      })
      installations = [%{id: "id", repository: %{id: "id2", name: "repo", description: "desc"}}]

      expect(HTTPoison, :post, fn _, ^body, _ ->
        {:ok, %{body: Jason.encode!(%{data: %{installations: as_connection(installations)}})}}
      end)

      {:ok, %{data: %{"installations" => %{"pageInfo" => page_info, "edges" => [edge]}}}} = run_query("""
        query {
          installations(first: 5) {
            pageInfo { hasNextPage endCursor }
            edges {
              node {
                id
                repository { id name description }
              }
            }
          }
        }
      """, %{}, %{current_user: insert(:user)})

      assert page_info["hasNextPage"]
      assert page_info["endCursor"] == "something"

      assert edge["node"]["id"] == "id"
      assert edge["node"]["repository"]["id"] == "id2"
      assert edge["node"]["repository"]["name"] == "repo"
      assert edge["node"]["repository"]["description"] == "desc"
    end
  end

  describe "repositories" do
    test "it can search repositories" do
      body = Jason.encode!(%{
        query: Queries.search_repositories_query(),
        variables: %{query: "query", first: 20}
      })

      repositories = [%{id: "id", name: "repo", description: "a repository"}]
      expect(HTTPoison, :post, fn _, ^body, _ ->
        {:ok, %{body: Jason.encode!(%{data: %{repositories: as_connection(repositories)}})}}
      end)

      {:ok, %{data: %{"repositories" => %{"pageInfo" => page_info, "edges" => [edge]}}}} = run_query("""
        query Repositories($query: String!) {
          repositories(query: $query, first: 20) {
            pageInfo { hasNextPage endCursor }
            edges {
              node { id name description }
            }
          }
        }
      """, %{"query" => "query"}, %{current_user: insert(:user)})

      assert page_info["hasNextPage"]
      assert page_info["endCursor"] == "something"

      assert edge["node"]["id"] == "id"
      assert edge["node"]["name"] == "repo"
      assert edge["node"]["description"] == "a repository"
    end
  end

  describe "recipes" do
    test "it can list recipes for a repo" do
      body = Jason.encode!(%{
        query: Queries.list_recipes_query(),
        variables: %{id: "id", provider: "AWS"}
      })

      recipes = [%{id: "id", name: "recipe", description: "a recipe", oidcSettings: %{authMethod: "POST"}}]
      expect(HTTPoison, :post, fn _, ^body, _ ->
        {:ok, %{body: Jason.encode!(%{data: %{recipes: as_connection(recipes)}})}}
      end)

      {:ok, %{data: %{"recipes" => %{"pageInfo" => page_info, "edges" => [edge]}}}} = run_query("""
        query Recipes($id: ID!) {
          recipes(id: $id, first: 20) {
            pageInfo { hasNextPage endCursor }
            edges {
              node { id name description oidcEnabled }
            }
          }
        }
      """, %{"id" => "id"}, %{current_user: insert(:user)})

      assert page_info["hasNextPage"]
      assert page_info["endCursor"] == "something"

      assert edge["node"]["id"] == "id"
      assert edge["node"]["name"] == "recipe"
      assert edge["node"]["description"] == "a recipe"
      assert edge["node"]["oidcEnabled"]
    end
  end

  describe "recipe" do
    test "it can get a recipe by id" do
      body = Jason.encode!(%{
        query: Queries.get_recipe_query(),
        variables: %{id: "id"}
      })

      recipe = %{
        id: "id",
        name: "name",
        description: "description",
        recipeSections: [
          %{
            id: "id2",
            repository: %{id: "id3"},
            recipeItems: [
              %{
                id: "id4",
                configuration: [%{name: "name", documentation: "some documentation", type: "STRING", optional: true}]
              }
            ]
          }
        ]
      }

      expect(HTTPoison, :post, fn _, ^body, _ ->
        {:ok, %{body: Jason.encode!(%{data: %{recipe: recipe}})}}
      end)

      {:ok, %{data: %{"recipe" => found}}} = run_query("""
        query Recipe($id: ID!) {
          recipe(id: $id) {
            id
            name
            description
            recipeSections {
              id
              repository { id }
              recipeItems {
                id
                configuration { name documentation type optional }
              }
            }
          }
        }
      """, %{"id" => "id"}, %{current_user: insert(:user)})

      assert found["id"] == "id"
      assert found["name"] == "name"
      assert found["description"] == "description"

      [section] = found["recipeSections"]
      assert section["id"] == "id2"
      assert section["repository"]["id"] == "id3"

      [item] = section["recipeItems"]

      assert item["id"] == "id4"
      assert hd(item["configuration"])["name"] == "name"
      assert hd(item["configuration"])["documentation"] == "some documentation"
      assert hd(item["configuration"])["type"] == "STRING"
      assert hd(item["configuration"])["optional"]
    end

    test "it will set oidc enabled correctly" do
      body = Jason.encode!(%{
        query: Queries.get_recipe_query(),
        variables: %{id: "id"}
      })

      recipe = %{
        id: "id",
        name: "name",
        description: "description",
        recipeDependencies: [
          %{
            id: "id2",
            name: "recipe 2",
            repository: %{name: "repo"},
            oidcSettings: %{urlFormat: "https://example.com"}
          }
        ],
        recipeSections: [
          %{
            id: "id2",
            repository: %{id: "id3"},
            recipeItems: [
              %{
                id: "id4",
                configuration: [%{name: "name", documentation: "some documentation", type: "STRING"}]
              }
            ]
          }
        ]
      }

      expect(HTTPoison, :post, fn _, ^body, _ ->
        {:ok, %{body: Jason.encode!(%{data: %{recipe: recipe}})}}
      end)

      {:ok, %{data: %{"recipe" => found}}} = run_query("""
        query Recipe($id: ID!) {
          recipe(id: $id) {
            id
            name
            description
            oidcEnabled
          }
        }
      """, %{"id" => "id"}, %{current_user: insert(:user)})

      assert found["id"] == "id"
      assert found["name"] == "name"
      assert found["description"] == "description"
      assert found["oidcEnabled"]
    end
  end

  describe "applications" do
    test "it can fetch all applications" do
      expect(Kazan, :run, fn _ ->
        {:ok, %ApplicationList{items: [application("redis")]}}
      end)

      expect(HTTPoison, :get, fn _ ->
        {:ok, %{status_code: 200, body: @kubecost}}
      end)

      {:ok, %{data: %{"applications" => [app]}}} = run_query("""
        query {
          applications {
            name
            spec { descriptor { type } }
            cost { cpuCost ramCost }
          }
        }
      """, %{}, %{current_user: insert(:user)})

      assert app["name"] == "redis"
      assert app["spec"]["descriptor"]["type"] == "redis"
      assert app["cost"]["cpuCost"]
      assert app["cost"]["ramCost"]
    end

    test "it can sideload license data" do
      expect(Kazan, :run, 2, fn
        %{path: "/apis/platform.plural.sh" <> _} ->
          {:ok, %Kube.LicenseList{items: [license("redis")]}}
        _ ->
          {:ok, %ApplicationList{items: [application("redis")]}}
      end)


      {:ok, %{data: %{"applications" => [app]}}} = run_query("""
        query {
          applications {
            name
            spec { descriptor { type } }
            license { status { free } }
          }
        }
      """, %{}, %{current_user: insert(:user)})

      assert app["name"] == "redis"
      assert app["spec"]["descriptor"]["type"] == "redis"
      assert app["license"]["status"]["free"]
    end
  end

  describe "stack" do
    test "it can get a stack by name" do
      body = Jason.encode!(%{
        query: Queries.get_stack_query(),
        variables: %{name: "id", provider: "AWS"}
      })

      section = %{
        id: "id2",
        repository: %{id: "id3"},
        recipeItems: [
          %{
            id: "id4",
            configuration: [%{name: "name", documentation: "some documentation", type: "STRING"}]
          }
        ]
      }

      recipe = %{
        id: "id",
        name: "name",
        description: "description",
        recipeSections: [section]
      }

      stack = %{name: "id", sections: [section], bundles: [recipe]}

      expect(HTTPoison, :post, fn _, ^body, _ ->
        {:ok, %{body: Jason.encode!(%{data: %{stack: stack}})}}
      end)

      {:ok, %{data: %{"stack" => %{"bundles" => [r], "sections" => [s]}}}} = run_query("""
        query Stack($name: String!) {
          stack(name: $name) {
            bundles { name }
            sections { id recipeItems { id } }
          }
        }
      """, %{"name" => "id"}, %{current_user: insert(:user)})

      assert r["name"] == "name"

      assert s["id"] == "id2"

      [item] = s["recipeItems"]
      assert item["id"] == "id4"
    end
  end

  describe "application" do
    test "it can fetch an application by name" do
      expect(Kazan, :run, fn _ -> {:ok, application("app")} end)

      {:ok, %{data: %{"application" => app}}} = run_query("""
        query App($name: String!) {
          application(name: $name) {
            name
            spec { descriptor { type } }
          }
        }
      """, %{"name" => "app"}, %{current_user: insert(:user)})

      assert app["name"] == "app"
      assert app["spec"]["descriptor"]["type"] == "app"
    end

    test "admins can sideload configuration by name" do
      user = insert(:user, roles: %{admin: true})
      expect(Kazan, :run, fn _ -> {:ok, application("app")} end)
      expect(Console.Deployer, :file, 2, fn _ -> {:ok, "found"} end)

      {:ok, %{data: %{"application" => app}}} = run_query("""
        query App($name: String!) {
          application(name: $name) {
            name
            spec { descriptor { type } }
            configuration {
              terraform
              helm
            }
          }
        }
      """, %{"name" => "app"}, %{current_user: user})

      assert app["name"] == "app"
      assert app["spec"]["descriptor"]["type"] == "app"
      assert app["configuration"]["helm"] == "found"
      assert app["configuration"]["terraform"] == "found"
    end

    test "users w/ rbac can sideload configuration by name" do
      user = insert(:user)
      setup_rbac(user, ["app"], configure: true)
      expect(Kazan, :run, fn _ -> {:ok, application("app")} end)
      expect(Console.Deployer, :file, 2, fn _ -> {:ok, "found"} end)

      {:ok, %{data: %{"application" => app}}} = run_query("""
        query App($name: String!) {
          application(name: $name) {
            name
            spec { descriptor { type } }
            configuration {
              terraform
              helm
            }
          }
        }
      """, %{"name" => "app"}, %{current_user: user})

      assert app["name"] == "app"
      assert app["spec"]["descriptor"]["type"] == "app"
      assert app["configuration"]["helm"] == "found"
      assert app["configuration"]["terraform"] == "found"
    end

    test "users w/o rbac cannot sideload configuration by name" do
      user = insert(:user)
      setup_rbac(user, ["other-app"], configure: true)
      expect(Kazan, :run, fn _ -> {:ok, application("app")} end)

      {:ok, %{errors: [_ | _]}} = run_query("""
        query App($name: String!) {
          application(name: $name) {
            name
            spec { descriptor { type } }
            configuration {
              terraform
              helm
            }
          }
        }
      """, %{"name" => "app"}, %{current_user: user})
    end
  end

  defp as_connection(nodes) do
    %{
      pageInfo: %{hasNextPage: true, endCursor: "something"},
      edges: Enum.map(nodes, & %{node: &1})
    }
  end

  defp application(name) do
    %Application{
      metadata: %{name: name, namespace: name},
      spec: %Application.Spec{
        descriptor: %Application.Descriptor{
          type: name
        }
      }
    }
  end
end
