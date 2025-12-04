import { ApiResponseDto } from '../dto/api-response.dto';
import { ClassConstructor, plainToInstance } from 'class-transformer';

/**
 * Creates a standardized success response with optional DTO serialization.
 * Handles single items, arrays, and paginated results with class-transformer serialization.
 * 
 * @template T - The response DTO type
 * @param data - The data to include in the response (can be single item, array, or paginated result)
 * @param message - Human-readable success message
 * @param statusCode - HTTP status code (e.g., 200, 201)
 * @param path - Optional request path for the response
 * @param ResponseDto - Optional DTO class for serialization
 * @param isArray - Set to true if data is an array (not paginated)
 * @param groups - Optional class-transformer groups for selective field exposure
 * @returns ApiResponseDto containing the serialized data and metadata
 * 
 * @example Single item
 * ```typescript
 * return successResponse(
 *   user,
 *   'User retrieved successfully',
 *   200,
 *   '/users/1',
 *   UserResponseDto,
 *   false,
 *   ['detail']
 * );
 * ```
 * 
 * @example Array of items
 * ```typescript
 * return successResponse(
 *   users,
 *   'Users retrieved successfully',
 *   200,
 *   '/users',
 *   UserResponseDto,
 *   true
 * );
 * ```
 * 
 * @example Paginated result
 * ```typescript
 * return successResponse(
 *   { data: users, meta: { total, page, limit, totalPages } },
 *   'Users retrieved successfully',
 *   200,
 *   '/users',
 *   UserResponseDto
 * );
 * ```
 */
export const successResponse = <T>(
    data: any,
    message: string,
    statusCode: number,
    path?: string,
    ResponseDto?: ClassConstructor<T>,
    isArray = false,
    groups?: string[],
): ApiResponseDto<T | T[]> => {
    // const serialized = ResponseDto
    //   ? plainToInstance(ResponseDto, data, { excludeExtraneousValues: true })
    //   : data;
    let serialized = data;
    if (ResponseDto) {
        if (isArray) {
            serialized = data.map((item: any) =>
                plainToInstance(ResponseDto, item, { excludeExtraneousValues: true, groups: groups }),
            );
        } else if (data?.data && Array.isArray(data.data)) {
            // ---------- paginated result ----------
            serialized = {
                ...data,
                data: data.data.map((item: any) =>
                    plainToInstance(ResponseDto, item, {
                        excludeExtraneousValues: true,
                        groups: groups,
                    }),
                ),
            };
        } else {
            // ---------- single item ----------
            serialized = plainToInstance(ResponseDto, data, {
                excludeExtraneousValues: true,
                groups: groups,
            });
        }
    }

    return new ApiResponseDto({
        data: serialized,
        message,
        statusCode,
        path,
        timestamp: new Date().toISOString(),
    });
};
