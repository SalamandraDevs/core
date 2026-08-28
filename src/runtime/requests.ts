import { CustomError } from './errors.js';

/**
 * Standard response body returned by the service APIs.
 * @template T - Expected response data type.
 */
export type ResponseBody<T> = {
  message: string;
  data: T | null;
};

/**
 * Response returned by `makeApiRequest`.
 * @template T - Expected response data type.
 */
export type ApiResponse<T> = {
  response: Response;
  body: ResponseBody<T>;
};

/**
 * Checks whether an unknown value is a standard service response body.
 * @template T - Expected response data type.
 * @param value - Value to inspect.
 * @returns `true` when the value has a string message and a data property.
 */
function isResponseBody<T>(value: unknown): value is ResponseBody<T> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  return 'message' in value && typeof value.message === 'string' && 'data' in value;
}

/**
 * Retry configuration for network failures.
 */
export type ApiRequestRetry = {
  attempts: number;
  delay: number;
};

/**
 * Performs an HTTP request with the Node.js `fetch` implementation.
 *
 * JSON responses are parsed automatically, while non-JSON responses are
 * returned as text. Standard service response bodies are preserved; other
 * successful responses are wrapped in the same response shape. HTTP failures
 * are returned as response data, while network and unexpected failures are
 * raised as `CustomError` instances.
 *
 * Retries apply only to fetch/network failures, never to HTTP error responses.
 * @template T - Expected response data type.
 * @param baseUrl - Base URL used to construct the request URL.
 * @param path - Relative or absolute path appended to the base URL.
 * @param options - Standard `fetch` request options.
 * @param retry - Optional network retry configuration.
 * @returns The native response and normalized response body.
 * @throws {CustomError} When the request cannot be completed or parsed.
 */
export async function makeApiRequest<T>(
  baseUrl: string,
  path: string,
  options: RequestInit,
  retry?: ApiRequestRetry
): Promise<ApiResponse<T>> {
  const attempts: number = Math.max(1, retry?.attempts ?? 1);
  const delay: number = Math.max(0, retry?.delay ?? 0);

  try {
    let response: Response | null = null;

    for (let index: number = 0; index < attempts; index++) {
      try {
        response = await fetch(baseUrl + path, options);
        break;
      } catch (error: unknown) {
        const isLastAttempt: boolean = index === attempts - 1;

        if (isLastAttempt) {
          throw error;
        }

        if (delay > 0) {
          await new Promise<void>((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    if (!response) {
      throw new Error('No response received from fetch.');
    }

    const contentType: string | null = response.headers.get('content-type');
    const isJsonResponse: boolean = contentType?.includes('application/json') ?? false;
    let parsedResponse: unknown;

    try {
      if (isJsonResponse) {
        const responseClone: Response = response.clone();

        try {
          parsedResponse = await response.json();
        } catch {
          parsedResponse = await responseClone.text();
        }
      } else {
        parsedResponse = await response.text();
      }
    } catch (error: unknown) {
      parsedResponse = String(error);
    }

    if (isResponseBody<T>(parsedResponse)) {
      return { response, body: parsedResponse };
    }

    if (response.ok) {
      return {
        response,
        body: {
          message: 'API call succeeded, returning a non-service response body.',
          data: parsedResponse as T
        }
      };
    }

    let errorMessage: string = response.statusText;

    if (isJsonResponse) {
      if (
        typeof parsedResponse === 'object' &&
        parsedResponse !== null &&
        'message' in parsedResponse
      ) {
        errorMessage += `: ${String(parsedResponse.message)}`;
      } else {
        errorMessage += `: ${JSON.stringify(parsedResponse)}`;
      }
    } else {
      errorMessage += `: ${String(parsedResponse)}`;
    }

    return {
      response,
      body: {
        message: errorMessage,
        data: null
      }
    };
  } catch (error: unknown) {
    const errorMessage: string =
      error instanceof Error ? error.message : 'An unknown error occurred';

    throw new CustomError({
      name: 'CONNECTION_ERROR',
      message: errorMessage,
      cause: error
    });
  }
}
