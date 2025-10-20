package v1alpha1

type ConditionType string

func (c ConditionType) String() string {
	return string(c)
}

const (
	ReadonlyConditionType              ConditionType = "Readonly"
	ReadyConditionType                 ConditionType = "Ready"
	ReadyTokenConditionType            ConditionType = "ReadyToken"
	SynchronizedConditionType          ConditionType = "Synchronized"
	NamespacedCredentialsConditionType ConditionType = "NamespacedCredentials"
)

type ConditionReason string

func (c ConditionReason) String() string {
	return string(c)
}

const (
	ReadonlyConditionReason             ConditionReason = "Readonly"
	ReadyConditionReason                ConditionReason = "Ready"
	ReadyConditionReasonDeleting        ConditionReason = "Deleting"
	SynchronizedConditionReason         ConditionReason = "Synchronized"
	SynchronizedConditionReasonError    ConditionReason = "Error"
	SynchronizedConditionReasonNotFound ConditionReason = "NotFound"
	SynchronizedConditionReasonDeleting ConditionReason = "Deleting"
	ReadyTokenConditionReason           ConditionReason = "Ready"
	ReadyTokenConditionReasonError      ConditionReason = "Error"
	NamespacedCredentialsReason         ConditionReason = "NamespacedCredentials"
	NamespacedCredentialsReasonDefault  ConditionReason = "DefaultCredentials"
)

type ConditionMessage string

func (c ConditionMessage) String() string {
	return string(c)
}

const (
	ReadonlyTrueConditionMessage          ConditionMessage = "Running in read-only mode"
	SynchronizedNotFoundConditionMessage  ConditionMessage = "Could not find resource in Console API"
	NamespacedCredentialsConditionMessage ConditionMessage = "Using default credentials"
)
