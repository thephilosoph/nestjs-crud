import {
    CallHandler,
    ExecutionContext,
    Injectable,
    mixin,
    NestInterceptor,
    Type,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class NoOpInterceptor implements NestInterceptor {
    intercept(
        context: ExecutionContext,
        next: CallHandler<any>,
    ): Observable<any> | Promise<Observable<any>> {
        return next.handle();
    }
}

export const maybeInterceptor = <T extends NestInterceptor>(
    factory: () => Type<T> | undefined | null,
): Type<NestInterceptor> => {
    const Interceptor = factory();
    if (!Interceptor) return NoOpInterceptor;

    return mixin(Interceptor);
};
