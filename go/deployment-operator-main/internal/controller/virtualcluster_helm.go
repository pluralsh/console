package controller

import (
	"context"
	"fmt"

	"github.com/pluralsh/console/go/polly/algorithms"
	corev1 "k8s.io/api/core/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/pluralsh/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/deployment-operator/internal/helm"
	"github.com/pluralsh/deployment-operator/pkg/common"
)

func (in *VirtualClusterController) deployVCluster(ctx context.Context, vCluster *v1alpha1.VirtualCluster) error {
	values, err := in.handleValues(ctx, vCluster.Spec.Helm.GetVCluster().HelmConfiguration, vCluster.Namespace)
	if err != nil {
		return err
	}

	initialValues := map[string]any{
		"exportKubeConfig": map[string]string{
			"server": fmt.Sprintf("https://%s.%s:443", vCluster.Name, vCluster.Namespace),
		},
	}

	values = algorithms.Merge(initialValues, values)

	deployer, err := helm.New(
		helm.WithReleaseName(vCluster.Name),
		helm.WithReleaseNamespace(vCluster.Namespace),
		helm.WithRepository(vCluster.Spec.Helm.GetVCluster().GetRepoUrl()),
		helm.WithChartName(vCluster.Spec.Helm.GetVCluster().GetChartName()),
		helm.WithValues(values),
	)
	if err != nil {
		return err
	}

	return deployer.Upgrade(true)
}

func (in *VirtualClusterController) deleteVCluster(vCluster *v1alpha1.VirtualCluster) error {
	deployer, err := helm.New(
		helm.WithReleaseName(vCluster.Name),
		helm.WithReleaseNamespace(vCluster.Namespace),
		helm.WithRepository(vCluster.Spec.Helm.GetVCluster().GetRepoUrl()),
		helm.WithChartName(vCluster.Spec.Helm.GetVCluster().GetChartName()),
	)
	if err != nil {
		return err
	}

	return deployer.Uninstall()
}

func (in *VirtualClusterController) deployAgent(ctx context.Context, vCluster *v1alpha1.VirtualCluster, deployToken string) error {
	kubeconfig, err := in.handleKubeconfigRef(ctx, vCluster)
	if err != nil {
		return err
	}

	values, err := in.handleValues(ctx, vCluster.Spec.Helm.GetAgent().HelmConfiguration, vCluster.Namespace)
	if err != nil {
		return err
	}

	initialValues := map[string]any{
		"secrets": map[string]string{
			"deployToken": deployToken,
		},
		"consoleUrl": fmt.Sprintf("%s/ext/gql", in.ConsoleUrl),
	}

	values = algorithms.Merge(initialValues, values)

	deployer, err := helm.New(
		helm.WithReleaseName(v1alpha1.AgentDefaultReleaseName),
		helm.WithReleaseNamespace(v1alpha1.AgentDefaultNamespace),
		helm.WithRepository(vCluster.Spec.Helm.GetAgent().GetRepoUrl()),
		helm.WithChartName(vCluster.Spec.Helm.GetAgent().GetChartName()),
		helm.WithKubeconfig(kubeconfig),
		helm.WithValues(values),
	)
	if err != nil {
		return err
	}

	return deployer.Upgrade(true)
}

func (in *VirtualClusterController) handleValues(ctx context.Context, helmConfiguration v1alpha1.HelmConfiguration, namespace string) (map[string]interface{}, error) {
	if helmConfiguration.Values != nil {
		values, err := common.Unmarshal(string(helmConfiguration.Values.Raw))
		if err != nil {
			return nil, err
		}

		return values, nil
	}

	if helmConfiguration.ValuesSecretRef != nil {
		return in.handleValuesSecretRef(
			ctx,
			client.ObjectKey{Name: helmConfiguration.ValuesSecretRef.Name, Namespace: namespace},
			helmConfiguration.ValuesSecretRef.Key,
		)
	}

	if helmConfiguration.ValuesConfigMapRef != nil {
		return in.handleValuesConfigMapRef(
			ctx,
			client.ObjectKey{Name: helmConfiguration.ValuesConfigMapRef.Name, Namespace: namespace},
			helmConfiguration.ValuesConfigMapRef.Key,
		)
	}

	return nil, nil
}

func (in *VirtualClusterController) handleValuesSecretRef(ctx context.Context, objKey client.ObjectKey, selectorKey string) (map[string]interface{}, error) {
	secret := &corev1.Secret{}

	if err := in.Get(
		ctx,
		objKey,
		secret,
	); err != nil {
		return nil, err
	}

	values, exists := secret.Data[selectorKey]
	if !exists {
		return nil, fmt.Errorf("secret %s/%s does not contain values", objKey.Namespace, objKey.Name)
	}

	valuesMap, err := common.Unmarshal(string(values))
	if err != nil {
		return nil, err
	}

	return valuesMap, nil
}

func (in *VirtualClusterController) handleValuesConfigMapRef(ctx context.Context, objKey client.ObjectKey, selectorKey string) (map[string]interface{}, error) {
	configMap := &corev1.ConfigMap{}

	if err := in.Get(
		ctx,
		objKey,
		configMap,
	); err != nil {
		return nil, err
	}

	values, exists := configMap.Data[selectorKey]
	if !exists {
		return nil, fmt.Errorf("config map %s/%s does not contain values", objKey.Namespace, objKey.Name)
	}

	valuesMap, err := common.Unmarshal(values)
	if err != nil {
		return nil, err
	}

	return valuesMap, nil
}

func (in *VirtualClusterController) handleKubeconfigRef(ctx context.Context, vCluster *v1alpha1.VirtualCluster) (string, error) {
	secret := &corev1.Secret{}

	if err := in.Get(
		ctx,
		client.ObjectKey{Name: vCluster.Spec.KubeconfigRef.Name, Namespace: vCluster.Namespace},
		secret,
	); err != nil {
		return "", err
	}

	kubeconfig, exists := secret.Data[v1alpha1.VClusterKubeconfigSecretKey]
	if !exists {
		return "", fmt.Errorf("secret %s/%s does not contain kubeconfig", vCluster.Namespace, vCluster.Spec.KubeconfigRef.Name)
	}

	return string(kubeconfig), nil
}
