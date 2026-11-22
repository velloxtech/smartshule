import {Request,Response,NextFunction} from 'express';
import {timingSafeEqual} from 'crypto';
import {UnauthorizedError} from '../../../core/domain/shared/Errors';

/** External callbacks are machine-to-machine actions, never public payment-write APIs. */
export function requirePaymentWebhook(req:Request,res:Response,next:NextFunction) {
  const expected=process.env.PAYMENT_WEBHOOK_TOKEN;
  if(!expected){res.status(503).json({success:false,message:'Payment callback authentication is not configured.'});return;}
  const header=req.headers['x-payment-webhook-token'];
  const supplied=typeof header==='string'?header:req.headers.authorization?.startsWith('Bearer ')?req.headers.authorization.slice(7):'';
  const actual=Buffer.from(supplied),secret=Buffer.from(expected);
  if(actual.length!==secret.length||!timingSafeEqual(actual,secret)){next(new UnauthorizedError('Payment callback authentication required.'));return;}
  next();
}
