package service

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/lib/pq"
	"github.com/samber/lo"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"gopkg.in/yaml.v3"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/cloud-query/internal/config"
	"github.com/pluralsh/console/go/cloud-query/internal/connection"
	"github.com/pluralsh/console/go/cloud-query/internal/log"
	"github.com/pluralsh/console/go/cloud-query/internal/proto/cloudquery"
)

type Extractor interface {
	Extract(connection.Connection) error
}

type Sink interface {
	Send(output *cloudquery.ExtractOutput) error
}

type dumpSink struct {
	dir string
}

func (in *dumpSink) Send(output *cloudquery.ExtractOutput) error {
	file, err := os.OpenFile(filepath.Join(in.dir, fmt.Sprintf("%s.yaml", output.Type)), os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return fmt.Errorf("failed to open file for writing: %w", err)
	}
	defer file.Close()

	var jsonData interface{}
	err = json.Unmarshal([]byte(output.Result), &jsonData)
	if err != nil {
		return fmt.Errorf("failed to unmarshal JSON: %w", err)
	}

	bytes, err := yaml.Marshal(jsonData)
	if err != nil {
		return fmt.Errorf("failed to marshal output to YAML: %w", err)
	}

	_, _ = file.WriteString(fmt.Sprintf("# Table: %s\n# ID: %s\n# Links: %s\n", output.Type, output.Id, output.Links))
	_, _ = file.Write(bytes)
	_, _ = file.WriteString("\n---\n")
	return err
}

func NewDumpSink(dir string) (Sink, error) {
	if dir == "" {
		return nil, fmt.Errorf("file path cannot be empty")
	}
	return &dumpSink{dir: dir}, nil
}

type Table interface {
	ID() string
	Links() []string
}

type AWSVPC struct {
	ARN string `json:"arn"`
}

func (in AWSVPC) ID() string {
	return in.ARN
}

func (in AWSVPC) Links() []string {
	return []string{}
}

type MockTable struct {
}

func (in MockTable) ID() string {
	return ""
}

func (in MockTable) Links() []string {
	return []string{}
}

type AWSVPCSubnet struct {
	MockTable

	ARN   string `json:"subnet_arn"`
	VPCID string `json:"vpc_id"`
}

func (in AWSVPCSubnet) ID() string {
	return in.ARN
}

func (in AWSVPCSubnet) Links() []string {
	return []string{in.VPCID}
}

type AWSVPCPeeringConnection struct {
	MockTable
}

type AWSVPCEndpoint struct {
	MockTable
}

type TableFactory func(json string) (Table, error)

func NewTable[T Table](rowJson string) (Table, error) {
	var result T
	err := json.Unmarshal([]byte(rowJson), &result)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal AWSVPC from JSON: %w", err)
	}

	return result, nil
}

var (
	tables = map[string]TableFactory{
		"aws_vpc":                    NewTable[AWSVPC],
		"aws_vpc_subnet":             NewTable[AWSVPCSubnet],
		"aws_vpc_peering_connection": NewTable[AWSVPCPeeringConnection],
		"aws_vpc_endpoint":           NewTable[AWSVPCEndpoint],
		//"aws_eks_addon",
		//"aws_eks_cluster",
		//"aws_eks_node_group",
		//"aws_ec2_instance",
		//"aws_s3_bucket",
	}
)

type extractor struct {
	sink   Sink
	tables map[string]TableFactory
}

type awsExtractor struct {
	extractor
}

func (in *awsExtractor) Extract(conn connection.Connection) error {
	klog.V(log.LogLevelDebug).InfoS("starting AWS extraction")

	for _, entry := range lo.Entries(tables) {
		table := entry.Key
		factory := entry.Value
		columns, rows, err := conn.Query("SELECT * FROM" + pq.QuoteIdentifier(table))
		if err != nil {
			return fmt.Errorf("failed to query table '%s': %w", table, err)
		}

		for _, row := range rows {
			klog.V(log.LogLevelDebug).InfoS("processing row", "table", table, "row", row)
			rowJson, err := toRowJSON(columns, row)
			if err != nil {
				return fmt.Errorf("failed to convert row to JSON: %w", err)
			}

			itable, err := factory(rowJson)
			if err != nil {
				return fmt.Errorf("could not create table interface: %w", err)
			}

			output := &cloudquery.ExtractOutput{
				Type:   table,
				Result: rowJson,
				Id:     itable.ID(),
				Links:  itable.Links(),
			}

			if err := in.sink.Send(output); err != nil {
				return fmt.Errorf("failed to send output: %w", err)
			}
		}
	}

	klog.V(log.LogLevelDebug).InfoS("AWS extraction completed")
	return nil
}

//output := &cloudquery.ExtractOutput{
//Type:   "",  // type of the output, e.g., "aws_vpc"
//Result: "",  // json blob of the row content
//Id:     "",  // provider resource id
//Links:  nil, // links to the resources, e.g., AWS ARN
//}

func NewExtractor(provider config.Provider, sink Sink) (Extractor, error) {
	switch provider {
	case config.ProviderAWS:
		return &awsExtractor{
			extractor: extractor{
				tables: tables,
				sink:   sink,
			},
		}, nil
	default:
		return nil, status.Errorf(codes.Unimplemented, "extractor for provider '%s' is not implemented", provider)
	}
}

// Extract implements the cloudquery.CloudQueryServer interface
func (in *CloudQueryService) Extract(input *cloudquery.ExtractInput, stream grpc.ServerStreamingServer[cloudquery.ExtractOutput]) error {
	conn, provider, err := in.createProviderConnection(input.GetConnection())
	if err != nil {
		return err
	}

	return in.handleExtract(conn, provider, stream)
}

func (in *CloudQueryService) handleExtract(c connection.Connection, provider config.Provider, _ grpc.ServerStreamingServer[cloudquery.ExtractOutput]) error {
	sink, _ := NewDumpSink("bin/dump")
	e, err := NewExtractor(provider, sink)
	if err != nil {
		return status.Errorf(codes.Unimplemented, "failed to create extractor for provider '%s': %v", provider, err)
	}

	if err = e.Extract(c); err != nil {
		return status.Errorf(codes.Internal, "failed to extract data from provider '%s': %v", provider, err)
	}

	return nil
}
