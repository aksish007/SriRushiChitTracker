/**
 * Utility functions for handling API errors and displaying user-friendly messages
 */

export interface ApiErrorResponse {
  error: string;
  details?: string;
  warnings?: string[];
  errors?: string[];
  relatedData?: any;
}

/**
 * Parse error response from API and return user-friendly message
 */
export function parseApiError(response: Response, errorData?: ApiErrorResponse): string {
  // If we have parsed error data, use it
  if (errorData?.error) {
    return errorData.error;
  }

  // Fallback to status-based messages
  switch (response.status) {
    case 400:
      return 'Invalid request. Please check your input and try again.';
    case 401:
      return 'You are not authorized to perform this action.';
    case 403:
      return 'Access denied. You do not have permission to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 409:
      return 'This action conflicts with existing data.';
    case 422:
      return 'The data you provided is invalid.';
    case 500:
      return 'An internal server error occurred. Please try again later.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Enhanced error handler for API responses
 */
export async function handleApiError(response: Response): Promise<{
  title: string;
  description: string;
  details?: string;
  warnings?: string[];
  errors?: string[];
}> {
  let errorData: ApiErrorResponse | null = null;
  
  try {
    // Try to parse JSON error response
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      errorData = await response.json();
    }
  } catch (parseError) {
    // If JSON parsing fails, we'll use status-based messages
    console.warn('Failed to parse error response as JSON:', parseError);
  }

  const errorMessage = parseApiError(response, errorData);
  
  // Determine appropriate title based on error type
  let title = 'Error';
  if (response.status === 400) {
    title = 'Invalid Request';
  } else if (response.status === 401) {
    title = 'Unauthorized';
  } else if (response.status === 403) {
    title = 'Access Denied';
  } else if (response.status === 404) {
    title = 'Not Found';
  } else if (response.status === 409) {
    title = 'Conflict';
  } else if (response.status === 422) {
    title = 'Validation Error';
  } else if (response.status >= 500) {
    title = 'Server Error';
  }

  return {
    title,
    description: errorMessage,
    details: errorData?.details,
    warnings: errorData?.warnings,
    errors: errorData?.errors,
  };
}

/**
 * Common error messages for specific scenarios
 */
export const ERROR_MESSAGES = {
  USER_DELETION: {
    ACTIVE_SUBSCRIPTIONS: 'Cannot delete user with active subscriptions',
    PAID_PAYOUTS: 'Cannot delete user with paid payouts',
    HAS_REFERRALS: 'Cannot delete user who has referred other users',
    FINANCIAL_RECORDS: 'Cannot delete user with financial history',
  },
  SUBSCRIPTION: {
    CHIT_FULL: 'This chit scheme is already full',
    USER_ALREADY_SUBSCRIBED: 'User is already subscribed to this chit scheme',
    INVALID_CHIT: 'Invalid chit scheme selected',
  },
  PAYOUT: {
    ALREADY_PAID: 'This payout has already been processed',
    INVALID_AMOUNT: 'Invalid payout amount',
    INVALID_MONTH: 'Invalid month for payout',
  },
  AUTHENTICATION: {
    INVALID_CREDENTIALS: 'Invalid username or password',
    SESSION_EXPIRED: 'Your session has expired. Please log in again.',
    INSUFFICIENT_PERMISSIONS: 'You do not have permission to perform this action',
  },
  VALIDATION: {
    REQUIRED_FIELD: 'This field is required',
    INVALID_EMAIL: 'Please enter a valid email address',
    INVALID_PHONE: 'Please enter a valid phone number',
    PASSWORD_MISMATCH: 'Passwords do not match',
  },
} as const;

/**
 * Get user-friendly error message for specific error types
 */
export function getErrorMessage(errorType: string, context?: any): string {
  const [category, type] = errorType.split('.');
  
  if (category && type && ERROR_MESSAGES[category as keyof typeof ERROR_MESSAGES]) {
    const categoryMessages = ERROR_MESSAGES[category as keyof typeof ERROR_MESSAGES] as any;
    if (categoryMessages[type]) {
      return categoryMessages[type];
    }
  }
  
  return 'An unexpected error occurred';
}

/**
 * Format error for display in toast notifications
 */
export function formatErrorForToast(error: {
  title: string;
  description: string;
  details?: string;
  warnings?: string[];
}): {
  title: string;
  description: string;
  variant: 'destructive' | 'default';
} {
  let description = error.description;
  
  // Add details if available
  if (error.details) {
    description += `\n\nDetails: ${error.details}`;
  }
  
  // Add warnings if available
  if (error.warnings && error.warnings.length > 0) {
    description += `\n\nWarnings:\n${error.warnings.map(w => `• ${w}`).join('\n')}`;
  }
  
  return {
    title: error.title,
    description,
    variant: 'destructive' as const,
  };
}
