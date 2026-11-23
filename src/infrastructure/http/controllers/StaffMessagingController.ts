import {Request,Response,NextFunction} from 'express';
import {z} from 'zod';
import {StaffMessagingUseCases} from '../../../application/messaging/StaffMessagingUseCases';
import {AuthenticatedRequest} from '../middlewares/authMiddleware';
const identifier = z.string().trim().min(1).max(200);
export const SendStaffMessageSchema = z.object({recipientId:identifier,body:z.string().trim().min(1).max(5000)}).strict();
export const BroadcastStaffMessageSchema = z.object({body:z.string().trim().min(1).max(5000)}).strict();
export const ReadStaffMessagesSchema = z.object({throughId:identifier}).strict();
export class StaffMessagingController {
  constructor(private useCases:StaffMessagingUseCases) {}
  private handle = (action:(req:AuthenticatedRequest)=>Promise<unknown>,status=200) => async(req:Request,res:Response,next:NextFunction) => {
    try { res.status(status).json({success:true,data:await action(req as AuthenticatedRequest)}); } catch(error) { next(error); }
  };
  contacts = this.handle(req=>this.useCases.contacts(req.user!));
  inbox = this.handle(req=>this.useCases.inbox(req.user!));
  messages = this.handle(req=>this.useCases.messages(req.user!,identifier.parse(req.params.userId),req.query.before === undefined ? undefined : identifier.parse(req.query.before)));
  send = this.handle(req=>this.useCases.send(req.user!,req.body),201);
  broadcast = this.handle(req=>this.useCases.sendToAllTeachers(req.user!,req.body),201);
  read = this.handle(async req=>{await this.useCases.markRead(req.user!,identifier.parse(req.params.userId),req.body.throughId);return {read:true};});
}
