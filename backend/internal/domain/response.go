package domain

type Response struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

type ErrorDetail struct {
	Field   string `json:"field,omitempty"`
	Message string `json:"message"`
}

type ErrorPayload struct {
	Code    string        `json:"code"`
	Message string        `json:"message"`
	Details []ErrorDetail `json:"details,omitempty"`
}

type ErrorResponse struct {
	Success bool         `json:"success"`
	Error   ErrorPayload `json:"error"`
}

func SuccessResponse(message string, data interface{}) Response {
	return Response{
		Success: true,
		Message: message,
		Data:    data,
	}
}

func FailureResponse(code string, message string, details []ErrorDetail) ErrorResponse {
	return ErrorResponse{
		Success: false,
		Error: ErrorPayload{
			Code:    code,
			Message: message,
			Details: details,
		},
	}
}
