# API Reference

## Packages
- [dbs.plural.sh/v1alpha1](#dbspluralshv1alpha1)


## dbs.plural.sh/v1alpha1

Package v1alpha1 contains API Schema definitions for the dbs v1alpha1 API group

### Resource Types
- [ElasticsearchCredentials](#elasticsearchcredentials)
- [ElasticsearchILMPolicy](#elasticsearchilmpolicy)
- [ElasticsearchIndexTemplate](#elasticsearchindextemplate)
- [ElasticsearchUser](#elasticsearchuser)









#### ElasticsearchCredentials



ElasticsearchCredentials is the Schema for the elasticsearchcredentials API





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `dbs.plural.sh/v1alpha1` | | |
| `kind` _string_ | `ElasticsearchCredentials` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[ElasticsearchCredentialsSpec](#elasticsearchcredentialsspec)_ |  |  |  |


#### ElasticsearchCredentialsSpec



ElasticsearchCredentialsSpec defines the desired state of ElasticsearchCredentials



_Appears in:_
- [ElasticsearchCredentials](#elasticsearchcredentials)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `insecure` _boolean_ |  |  |  |
| `url` _string_ |  |  |  |
| `username` _string_ |  |  |  |
| `passwordSecretKeyRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ |  |  |  |


#### ElasticsearchILMPolicy



ElasticsearchILMPolicy is the Schema for the ILM Policy API.





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `dbs.plural.sh/v1alpha1` | | |
| `kind` _string_ | `ElasticsearchILMPolicy` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[ElasticsearchILMPolicySpec](#elasticsearchilmpolicyspec)_ |  |  |  |


#### ElasticsearchILMPolicySpec



ElasticsearchILMPolicySpec defines the desired state of ILMPolicy.



_Appears in:_
- [ElasticsearchILMPolicy](#elasticsearchilmpolicy)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `credentialsRef` _[LocalObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#localobjectreference-v1-core)_ |  |  |  |
| `name` _string_ |  |  | Optional: {} <br /> |
| `definition` _[RawExtension](https://pkg.go.dev/k8s.io/apimachinery/pkg/runtime#RawExtension)_ | Definition of the Elasticsearch ILM policy.<br />See: https://www.elastic.co/docs/manage-data/lifecycle/index-lifecycle-management/index-lifecycle |  | Required: {} <br /> |


#### ElasticsearchIndexTemplate



ElasticsearchIndexTemplate is the Schema for the elasticsearchindextemplates API





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `dbs.plural.sh/v1alpha1` | | |
| `kind` _string_ | `ElasticsearchIndexTemplate` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[ElasticsearchIndexTemplateSpec](#elasticsearchindextemplatespec)_ |  |  |  |


#### ElasticsearchIndexTemplateDefinition







_Appears in:_
- [ElasticsearchIndexTemplateSpec](#elasticsearchindextemplatespec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `indexPatterns` _string array_ |  |  |  |
| `template` _[RawExtension](https://pkg.go.dev/k8s.io/apimachinery/pkg/runtime#RawExtension)_ |  |  |  |


#### ElasticsearchIndexTemplateSpec



ElasticsearchIndexTemplateSpec defines the desired state of ElasticsearchIndexTemplate



_Appears in:_
- [ElasticsearchIndexTemplate](#elasticsearchindextemplate)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ |  |  |  |
| `credentialsRef` _[LocalObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#localobjectreference-v1-core)_ |  |  |  |
| `definition` _[ElasticsearchIndexTemplateDefinition](#elasticsearchindextemplatedefinition)_ |  |  |  |


#### ElasticsearchRole







_Appears in:_
- [ElasticsearchUserDefinition](#elasticsearchuserdefinition)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `name` _string_ |  |  |  |
| `clusterPermissions` _string array_ |  |  |  |
| `indexPermissions` _[IndexPermission](#indexpermission) array_ |  |  |  |


#### ElasticsearchUser



ElasticsearchUser is the Schema for the elasticsearchusers API





| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `apiVersion` _string_ | `dbs.plural.sh/v1alpha1` | | |
| `kind` _string_ | `ElasticsearchUser` | | |
| `metadata` _[ObjectMeta](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#objectmeta-v1-meta)_ | Refer to Kubernetes API documentation for fields of `metadata`. |  |  |
| `spec` _[ElasticsearchUserSpec](#elasticsearchuserspec)_ |  |  |  |


#### ElasticsearchUserDefinition







_Appears in:_
- [ElasticsearchUserSpec](#elasticsearchuserspec)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `user` _string_ | User to add |  |  |
| `passwordSecretKeyRef` _[SecretKeySelector](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#secretkeyselector-v1-core)_ | PasswordSecretKeyRef reference |  |  |
| `role` _[ElasticsearchRole](#elasticsearchrole)_ | Role represents the structure and assignment of roles in Elasticsearch. |  |  |


#### ElasticsearchUserSpec



ElasticsearchUserSpec defines the desired state of ElasticsearchUser



_Appears in:_
- [ElasticsearchUser](#elasticsearchuser)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `credentialsRef` _[LocalObjectReference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#localobjectreference-v1-core)_ |  |  |  |
| `definition` _[ElasticsearchUserDefinition](#elasticsearchuserdefinition)_ |  |  |  |


#### IndexPermission







_Appears in:_
- [ElasticsearchRole](#elasticsearchrole)

| Field | Description | Default | Validation |
| --- | --- | --- | --- |
| `names` _string array_ |  |  |  |
| `privileges` _string array_ |  |  |  |






