import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  NotFoundException,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { isEmpty } from 'class-validator';
import { Observable, tap } from 'rxjs';

@Injectable()
export class NotFoundInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      tap((data) => {
        if (isEmpty(data)) {
          if (context.getType() === 'http') throw new NotFoundException();
          else if (context.getType() === 'rpc')
            throw new RpcException({ code: 5, message: 'Data not found' });
        }
      }),
    );
  }
}
