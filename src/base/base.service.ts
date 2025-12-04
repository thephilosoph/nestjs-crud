import {
  Repository,
  ObjectLiteral,
  EntityManager,
  DeepPartial,
  FindOneOptions,
  FindManyOptions,
  DeleteResult,
  UpdateResult,
} from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { NotFoundException } from '@nestjs/common';

/**
 * Base service class providing common CRUD operations for TypeORM entities.
 * Extend this class in your entity services to inherit standard database operations.
 * 
 * @template T - The entity type that extends ObjectLiteral
 * 
 * @example
 * ```typescript
 * @Injectable()
 * export class UserService extends BaseService<User> {
 *   constructor(
 *     @InjectRepository(User)
 *     public repository: Repository<User>
 *   ) {
 *     super();
 *   }
 * }
 * ```
 */
export abstract class BaseService<T extends ObjectLiteral> {
  protected abstract readonly repository: Repository<T>;

  /**
   * Gets the entity name from the repository metadata.
   * Used internally for error messages.
   * 
   * @returns The entity name
   * @protected
   */
  protected getEntityName(): string {
    return this.repository.metadata.name;
  }

  /**
   * Gets the repository instance, optionally from a transaction manager.
   * 
   * @param manager - Optional EntityManager for transaction support
   * @returns Repository instance
   * @protected
   */
  protected getRepository(manager?: EntityManager): Repository<T> {
    return manager
      ? manager.getRepository<T>(this.repository.target)
      : this.repository;
  }

  /**
   * Hook method for handling file uploads after entity creation/update.
   * Override this method in your service to implement custom file handling logic.
   * 
   * @param entity - The entity that was created or updated
   * @param files - Array of uploaded files from multer
   * @returns Promise that resolves when file handling is complete
   * @protected
   * 
   * @example
   * ```typescript
   * protected async handleFiles(entity: User, files: Express.Multer.File[]): Promise<void> {
   *   if (files.length > 0) {
   *     entity.avatarPath = files[0].path;
   *     await this.repository.save(entity);
   *   }
   * }
   * ```
   */
  protected async handleFiles(entity: T, files: Express.Multer.File[]): Promise<void> {
    // Override this method to handle file uploads
  }

  /**
   * Finds a single entity matching the given options.
   * Throws NotFoundException if no entity is found.
   * 
   * @param options - TypeORM FindOneOptions for querying
   * @returns Promise resolving to the found entity
   * @throws NotFoundException if entity is not found
   * 
   * @example
   * ```typescript
   * const user = await this.userService.findOne({
   *   where: { email: 'user@example.com' },
   *   relations: ['profile']
   * });
   * ```
   */
  async findOne(options: FindOneOptions): Promise<T> {
    const result = await this.repository.findOne(options);
    if (!result) {
      throw new NotFoundException(`${this.getEntityName()} not found`);
    }
    return result;
  }

  /**
   * Finds all entities matching the given options.
   * 
   * @param options - TypeORM FindManyOptions for querying
   * @returns Promise resolving to array of entities
   * 
   * @example
   * ```typescript
   * const users = await this.userService.findAll({
   *   where: { isActive: true },
   *   order: { createdAt: 'DESC' }
   * });
   * ```
   */
  async findAll(options: FindManyOptions): Promise<T[]> {
    return await this.repository.find(options ?? {});
  }

  /**
   * Finds a single entity by its ID.
   * Throws NotFoundException if entity is not found.
   * 
   * @param id - The entity ID (number or string)
   * @param options - Optional FindOneOptions for additional query configuration
   * @returns Promise resolving to the found entity
   * @throws NotFoundException if entity with given ID is not found
   * 
   * @example
   * ```typescript
   * const user = await this.userService.findById(1, {
   *   relations: ['posts', 'comments']
   * });
   * ```
   */
  async findById(id: number | string, options?: FindOneOptions<T>): Promise<T> {
    const result = await this.repository.findOne({
      where: { id } as any,
      ...options,
    });
    if (!result) {
      throw new NotFoundException(
        `${this.getEntityName()} with id ${id} not found`,
      );
    }
    return result;
  }

  /**
   * Creates a new entity from the provided DTO.
   * Optionally handles file uploads and supports transactions.
   * 
   * @param dto - Data transfer object containing entity data
   * @param manager - Optional EntityManager for transaction support
   * @param files - Optional array of uploaded files
   * @returns Promise resolving to the created entity
   * 
   * @example
   * ```typescript
   * const user = await this.userService.create({
   *   name: 'John Doe',
   *   email: 'john@example.com'
   * });
   * ```
   * 
   * @example With transaction
   * ```typescript
   * await this.userService.transactional(async (manager) => {
   *   return await this.userService.create(dto, manager);
   * });
   * ```
   */
  async create(
    dto: DeepPartial<T>,
    manager?: EntityManager,
    files?: Express.Multer.File[],
  ): Promise<T> {
    const repo = this.getRepository(manager);
    const entity = repo.create(dto);
    const saved = await repo.save(entity);
    if (files?.length) {
      await this.handleFiles(saved, files);
    }
    return saved;
  }

  /**
   * Updates an entity matching the given criteria.
   * Optionally handles file uploads and supports transactions.
   * 
   * @param criteria - Criteria to find the entity to update (usually { id: number })
   * @param partialEntity - Partial entity data to update
   * @param manager - Optional EntityManager for transaction support
   * @param files - Optional array of uploaded files
   * @returns Promise resolving to the updated entity or null if not found
   * 
   * @example
   * ```typescript
   * const updated = await this.userService.update(
   *   { id: 1 },
   *   { name: 'Jane Doe' }
   * );
   * ```
   */
  async update(
    criteria: any,
    partialEntity: QueryDeepPartialEntity<T>,
    manager?: EntityManager,
    files?: Express.Multer.File[],
  ): Promise<T | null> {
    const repo = this.getRepository(manager);
    await repo.update(criteria, partialEntity);
    const updated = await repo.findOne({ where: criteria } as FindOneOptions<T>);
    if (updated && files?.length) {
      await this.handleFiles(updated, files);
    }
    return updated;
  }

  /**
   * Deletes an entity by ID.
   * Supports both soft delete (sets deletedAt timestamp) and hard delete (removes from database).
   * 
   * @param id - The entity ID to delete
   * @param soft - If true, performs soft delete; if false, performs hard delete
   * @param manager - Optional EntityManager for transaction support
   * @returns Promise resolving to DeleteResult or UpdateResult
   * 
   * @example Soft delete
   * ```typescript
   * await this.userService.delete(1, true);
   * ```
   * 
   * @example Hard delete
   * ```typescript
   * await this.userService.delete(1, false);
   * ```
   */
  async delete(
    id: number | string,
    soft: boolean,
    manager?: EntityManager,
  ): Promise<DeleteResult | UpdateResult> {
    const repo = this.getRepository(manager);
    if (soft) {
      return await repo.softDelete(id);
    }
    return await repo.delete(id);
  }

  /**
   * Executes a function within a database transaction.
   * All operations within the callback will be rolled back if an error occurs.
   * 
   * @template R - The return type of the transaction callback
   * @param runInTransaction - Callback function that receives an EntityManager
   * @returns Promise resolving to the callback's return value
   * 
   * @example
   * ```typescript
   * const result = await this.userService.transactional(async (manager) => {
   *   const user = await this.userService.create(userDto, manager);
   *   const profile = await this.profileService.create(profileDto, manager);
   *   return { user, profile };
   * });
   * ```
   */
  async transactional<R>(
    runInTransaction: (manager: EntityManager) => Promise<R>,
  ): Promise<R> {
    return await this.repository.manager.transaction(runInTransaction);
  }

  /**
   * Retrieves paginated results with metadata.
   * 
   * @param options - FindManyOptions combined with pagination parameters
   * @param options.page - Page number (1-indexed)
   * @param options.limit - Number of items per page
   * @param options.where - Optional where conditions
   * @returns Promise resolving to paginated data with metadata
   * 
   * @example
   * ```typescript
   * const result = await this.userService.paginate({
   *   page: 1,
   *   limit: 10,
   *   where: { isActive: true },
   *   order: { createdAt: 'DESC' }
   * });
   * // Returns: { data: [...], meta: { total, page, limit, totalPages } }
   * ```
   */
  async paginate(
    options: FindManyOptions<T> & {
      page: number;
      limit: number;
      where?: any;
    },
  ) {
    const { page, limit, where = {}, ...rest } = options;
    const [data, total] = await this.repository.findAndCount({
      where,
      ...rest,
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
