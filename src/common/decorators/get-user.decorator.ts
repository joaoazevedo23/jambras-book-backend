import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { JwtPayloadWithRt } from '../../auth/strategies/rt.strategy';

export const GetUser = createParamDecorator(
  (
    data: keyof JwtPayloadWithRt | undefined,
    ctx: ExecutionContext,
  ): JwtPayloadWithRt | JwtPayloadWithRt[keyof JwtPayloadWithRt] => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user: JwtPayloadWithRt }>();

    if (!data) return request.user;
    return request.user[data];
  },
);
