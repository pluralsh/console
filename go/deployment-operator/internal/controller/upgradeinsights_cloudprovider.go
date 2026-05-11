package controller

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	awscredentials "github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/feature/ec2/imds"
	"github.com/aws/aws-sdk-go-v2/service/eks"
	"github.com/aws/aws-sdk-go-v2/service/eks/types"
	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/polly/algorithms"
	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
	runtimeclient "sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"

	"github.com/pluralsh/deployment-operator/api/v1alpha1"
)

type CloudProvider interface {
	UpgradeInsights(context.Context, v1alpha1.UpgradeInsights) ([]console.UpgradeInsightAttributes, []console.CloudAddonAttributes, error)
}

type EKSCloudProvider struct {
	kubeClient  runtimeclient.Client
	clusterName string
}

func (in *EKSCloudProvider) UpgradeInsights(ctx context.Context, ui v1alpha1.UpgradeInsights) ([]console.UpgradeInsightAttributes, []console.CloudAddonAttributes, error) {
	client, err := in.client(ctx, ui)
	if err != nil {
		return nil, nil, err
	}

	insights, err := in.listInsights(ctx, client)
	if err != nil {
		return nil, nil, err
	}

	addons, err := in.listAddons(ctx, client)
	if err != nil {
		return nil, nil, err
	}

	return in.toUpgradeInsightAttributes(insights), in.toClusterAddonsAttributes(addons), nil
}

func (in *EKSCloudProvider) listInsights(ctx context.Context, client *eks.Client) (_ []*types.Insight, retErr error) {
	logger := log.FromContext(ctx)
	var result []types.InsightSummary

	out, err := client.ListInsights(ctx, &eks.ListInsightsInput{
		ClusterName: lo.ToPtr(in.clusterName),
	})
	if err != nil {
		return nil, err
	}

	result = out.Insights
	nextToken := out.NextToken
	for out.NextToken != nil {
		out, err = client.ListInsights(ctx, &eks.ListInsightsInput{
			ClusterName: lo.ToPtr(in.clusterName),
			NextToken:   nextToken,
		})
		if err != nil {
			return nil, err
		}

		nextToken = out.NextToken
		result = append(result, out.Insights...)
	}

	return algorithms.Filter(
		algorithms.Map(result, func(insight types.InsightSummary) *types.Insight {
			output, err := client.DescribeInsight(ctx, &eks.DescribeInsightInput{
				ClusterName: lo.ToPtr(in.clusterName),
				Id:          insight.Id,
			})
			// If there is an error getting the details of an insight just ignore.
			// It will be picked up during the next reconcile.
			if err != nil {
				logger.Error(err, "could not describe insight", "clusterName", in.clusterName, "id", insight.Id)
				retErr = err
				return nil
			}

			return output.Insight
		}), func(insight *types.Insight) bool {
			return insight != nil
		}), retErr
}

func (in *EKSCloudProvider) listAddons(ctx context.Context, client *eks.Client) (_ []*types.Addon, retErr error) {
	logger := log.FromContext(ctx)
	var result []string

	out, err := client.ListAddons(ctx, &eks.ListAddonsInput{
		ClusterName: new(in.clusterName),
	})
	if err != nil {
		return nil, err
	}

	result = out.Addons
	nextToken := out.NextToken
	for out.NextToken != nil {
		out, err = client.ListAddons(ctx, &eks.ListAddonsInput{
			ClusterName: new(in.clusterName),
			NextToken:   nextToken,
		})
		if err != nil {
			return nil, err
		}

		nextToken = out.NextToken
		result = append(result, out.Addons...)
	}

	return algorithms.Filter(
		algorithms.Map(result, func(addon string) *types.Addon {
			output, err := client.DescribeAddon(ctx, &eks.DescribeAddonInput{
				AddonName:   new(addon),
				ClusterName: new(in.clusterName),
			})
			// If there is an error getting the details of an addon just ignore.
			// It will be picked up during the next reconcile.
			if err != nil {
				logger.Error(err, "could not describe addon", "clusterName", in.clusterName, "addonName", addon)
				retErr = err
				return nil
			}

			return output.Addon
		}), func(addon *types.Addon) bool {
			return addon != nil
		}), retErr
}

func (in *EKSCloudProvider) toClusterAddonsAttributes(addons []*types.Addon) []console.CloudAddonAttributes {
	return algorithms.Map(addons, func(addon *types.Addon) console.CloudAddonAttributes {
		return console.CloudAddonAttributes{
			Distro:  new(console.ClusterDistroEks),
			Name:    addon.AddonName,
			Version: addon.AddonVersion,
		}
	})
}

func (in *EKSCloudProvider) toUpgradeInsightAttributes(insights []*types.Insight) []console.UpgradeInsightAttributes {
	return algorithms.Map(insights, func(insight *types.Insight) console.UpgradeInsightAttributes {
		var refreshedAt *string
		if insight.LastRefreshTime != nil {
			refreshedAt = new(insight.LastRefreshTime.Format(time.RFC3339))
		}

		var transitionedAt *string
		if insight.LastTransitionTime != nil {
			transitionedAt = new(insight.LastTransitionTime.Format(time.RFC3339))
		}

		return console.UpgradeInsightAttributes{
			Name:           lo.FromPtr(insight.Name),
			Version:        insight.KubernetesVersion,
			Description:    insight.Description,
			Status:         in.fromInsightStatus(insight.InsightStatus),
			Details:        in.toInsightDetails(insight),
			RefreshedAt:    refreshedAt,
			TransitionedAt: transitionedAt,
		}
	})
}

func (in *EKSCloudProvider) fromInsightStatus(status *types.InsightStatus) *console.UpgradeInsightStatus {
	if status == nil {
		return nil
	}

	switch status.Status {
	case types.InsightStatusValuePassing:
		return new(console.UpgradeInsightStatusPassing)
	case types.InsightStatusValueError:
		return new(console.UpgradeInsightStatusFailed)
	case types.InsightStatusValueWarning:
		return new(console.UpgradeInsightStatusWarning)
	case types.InsightStatusValueUnknown:
		return new(console.UpgradeInsightStatusUnknown)
	}

	return nil
}

func (in *EKSCloudProvider) fromClientStats(stats []types.ClientStat) *console.UpgradeInsightStatus {
	const failedBeforeDuration = 24.0       // 24 hours
	const warningBeforeDuration = 24.0 * 30 // 30 days

	for _, stat := range stats {
		if stat.LastRequestTime != nil && time.Since(*stat.LastRequestTime).Hours() < failedBeforeDuration {
			return new(console.UpgradeInsightStatusFailed)
		}

		if stat.LastRequestTime != nil && time.Since(*stat.LastRequestTime).Hours() < warningBeforeDuration {
			return new(console.UpgradeInsightStatusWarning)
		}
	}

	return new(console.UpgradeInsightStatusPassing)
}

func (in *EKSCloudProvider) toInsightDetails(insight *types.Insight) []*console.UpgradeInsightDetailAttributes {
	if insight.CategorySpecificSummary == nil {
		return nil
	}

	result := make([]*console.UpgradeInsightDetailAttributes, 0)
	for _, r := range insight.CategorySpecificSummary.DeprecationDetails {
		result = append(result, &console.UpgradeInsightDetailAttributes{
			Used:        r.Usage,
			Replacement: r.ReplacedWith,
			ReplacedIn:  r.StartServingReplacementVersion,
			RemovedIn:   r.StopServingVersion,
			Status:      in.fromClientStats(r.ClientStats),
			ClientInfo: algorithms.Map(r.ClientStats, func(cs types.ClientStat) *console.InsightClientInfoAttributes {
				return &console.InsightClientInfoAttributes{
					UserAgent:     cs.UserAgent,
					Count:         new(strconv.FormatInt(int64(cs.NumberOfRequestsLast30Days), 10)),
					LastRequestAt: new(cs.LastRequestTime.Format(time.RFC3339)),
				}
			}),
		})
	}

	return result
}

func (in *EKSCloudProvider) config(ctx context.Context, ui v1alpha1.UpgradeInsights) (aws.Config, error) {
	options := []func(*awsconfig.LoadOptions) error{
		awsconfig.WithEC2IMDSRegion(func(o *awsconfig.UseEC2IMDSRegion) {
			o.Client = imds.New(imds.Options{
				EnableFallback: aws.FalseTernary,
			})
		}),
	}

	if in.hasAccessKeys(ui) {
		options = append(options, in.withCredentials(ctx, ui))
	}

	if in.hasRegion(ui) {
		options = append(options, in.withRegion(ui))
	}

	return awsconfig.LoadDefaultConfig(ctx, options...)
}

func (in *EKSCloudProvider) hasCredentials(ui v1alpha1.UpgradeInsights) bool {
	return ui.Spec.Credentials != nil && ui.Spec.Credentials.AWS != nil
}

func (in *EKSCloudProvider) hasAccessKeys(ui v1alpha1.UpgradeInsights) bool {
	return in.hasCredentials(ui) &&
		ui.Spec.Credentials.AWS.SecretAccessKeyRef != nil &&
		ui.Spec.Credentials.AWS.AccessKeyID != nil
}

func (in *EKSCloudProvider) hasRegion(ui v1alpha1.UpgradeInsights) bool {
	return in.hasCredentials(ui) && len(ui.Spec.Credentials.AWS.Region) > 0
}

func (in *EKSCloudProvider) withCredentials(ctx context.Context, ui v1alpha1.UpgradeInsights) awsconfig.LoadOptionsFunc {
	credentials := ui.Spec.Credentials.AWS
	return func(options *awsconfig.LoadOptions) error {
		secretAccessKey, err := in.handleSecretAccessKeyRef(ctx, *credentials.SecretAccessKeyRef, ui.Namespace)
		if err != nil {
			return err
		}

		options.Credentials = awscredentials.NewStaticCredentialsProvider(
			*credentials.AccessKeyID,
			secretAccessKey,
			"",
		)
		return nil
	}
}

func (in *EKSCloudProvider) withRegion(ui v1alpha1.UpgradeInsights) awsconfig.LoadOptionsFunc {
	return func(options *awsconfig.LoadOptions) error {
		options.Region = ui.Spec.Credentials.AWS.Region
		return nil
	}
}

func (in *EKSCloudProvider) handleSecretAccessKeyRef(ctx context.Context, ref corev1.SecretReference, namespace string) (string, error) {
	secret := &corev1.Secret{}

	if err := in.kubeClient.Get(
		ctx,
		runtimeclient.ObjectKey{Name: ref.Name, Namespace: ref.Namespace},
		secret,
	); err != nil {
		return "", err
	}

	key := "secretAccessKey"
	value, exists := secret.Data[key]
	if !exists {
		return "", fmt.Errorf("secret %s/%s does not contain key %s", namespace, ref.Name, key)
	}

	return string(value), nil
}

func (in *EKSCloudProvider) client(ctx context.Context, ui v1alpha1.UpgradeInsights) (*eks.Client, error) {
	config, err := in.config(ctx, ui)
	if err != nil {
		return nil, err
	}

	return eks.NewFromConfig(config), nil
}

func newEKSCloudProvider(kubeClient runtimeclient.Client, clusterName string) CloudProvider {
	return &EKSCloudProvider{
		kubeClient:  kubeClient,
		clusterName: clusterName,
	}
}

func NewCloudProvider(distro *console.ClusterDistro, kubeClient runtimeclient.Client, clusterName string) (CloudProvider, error) {
	if distro == nil {
		return nil, fmt.Errorf("distro cannot be nil")
	}

	if *distro == console.ClusterDistroEks {
		return newEKSCloudProvider(kubeClient, clusterName), nil
	}

	return nil, fmt.Errorf("unsupported distro: %s", *distro)
}
