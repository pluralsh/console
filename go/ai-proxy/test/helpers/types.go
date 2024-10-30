package helpers

type TestStruct[Request any, Response any] struct {
	Name       string
	Method     string
	Endpoint   string
	Request    Request
	WantData   Response
	WantErr    error
	WantStatus int
}
