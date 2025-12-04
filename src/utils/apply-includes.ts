import { FindOneOptions, FindManyOptions } from 'typeorm';

/**
 * Applies relation includes to TypeORM find options.
 * Converts an array of relation names into TypeORM relations object.
 * 
 * @template T - The entity type
 * @param opts - TypeORM FindOneOptions
 * @param include - Optional array of relation names to include
 * @returns FindOneOptions with relations applied
 * 
 * @example
 * ```typescript
 * const options = applyIncludes(
 *   { where: { id: 1 } },
 *   ['profile', 'posts']
 * );
 * // Result: { where: { id: 1 }, relations: { profile: true, posts: true } }
 * ```
 */
export function applyIncludes<T>(
    opts: FindOneOptions<T>,
    include?: string[],
): FindOneOptions<T>;

/**
 * Applies relation includes to TypeORM find options.
 * Converts an array of relation names into TypeORM relations object.
 * 
 * @template T - The entity type
 * @param opts - TypeORM FindManyOptions
 * @param include - Optional array of relation names to include
 * @returns FindManyOptions with relations applied
 */
export function applyIncludes<T>(
    opts: FindManyOptions<T>,
    include?: string[],
): FindManyOptions<T>;

export function applyIncludes<T>(
    opts: FindOneOptions<T> | FindManyOptions<T>,
    include?: string[],
): FindOneOptions<T> | FindManyOptions<T> {
    if (!include?.length) return opts;

    const relations = include.reduce((acc, cur) => ({ ...acc, [cur]: true }), {});
    return { ...opts, relations };
}
