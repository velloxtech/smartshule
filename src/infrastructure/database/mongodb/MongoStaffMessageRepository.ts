import mongoose from 'mongoose';
import {IStaffMessageRepository} from '../../../core/ports/repositories/IStaffMessageRepository';
import {StaffMessage,StaffConversation} from '../../../core/domain/messaging/StaffMessage';
const schema = new mongoose.Schema({id:{type:String,required:true,unique:true},schoolId:{type:String,required:true},senderId:{type:String,required:true},recipientId:{type:String,required:true},body:{type:String,required:true,maxlength:5000},createdAt:{type:String,required:true},readAt:{type:String,default:null}},{versionKey:false});
schema.index({schoolId:1,senderId:1,createdAt:-1,id:-1});schema.index({schoolId:1,recipientId:1,createdAt:-1,id:-1});
const Model = mongoose.models.StaffMessage || mongoose.model('StaffMessage',schema);
const clean = (m:any):StaffMessage => ({id:m.id,schoolId:m.schoolId,senderId:m.senderId,recipientId:m.recipientId,body:m.body,createdAt:m.createdAt,readAt:m.readAt || null});
export class MongoStaffMessageRepository implements IStaffMessageRepository {
  async save(message:StaffMessage) { await Model.create(message); }
  async saveMany(messages:StaffMessage[]) {
    if (!messages.length) return;
    const session = await Model.db.startSession();
    try {
      await session.withTransaction(async () => { await Model.insertMany(messages,{session,ordered:true}); });
    } finally { await session.endSession(); }
  }
  async inbox(schoolId:string,userId:string):Promise<StaffConversation[]> {
    const rows = await Model.aggregate([
      {$match:{schoolId,$or:[{senderId:userId},{recipientId:userId}]}},{$sort:{createdAt:-1,id:-1}},
      {$group:{_id:{$cond:[{$eq:['$senderId',userId]},'$recipientId','$senderId']},lastMessage:{$first:'$$ROOT'},unreadCount:{$sum:{$cond:[{$and:[{$eq:['$recipientId',userId]},{$eq:['$readAt',null]}]},1,0]}}}},
      {$sort:{'lastMessage.createdAt':-1,'lastMessage.id':-1}}
    ]);
    return rows.map(r=>({peerId:r._id,lastMessage:clean(r.lastMessage),unreadCount:r.unreadCount}));
  }
  private scope(schoolId:string,userId:string,peerId:string) { return {schoolId,$or:[{senderId:userId,recipientId:peerId},{senderId:peerId,recipientId:userId}]}; }
  async messages(schoolId:string,userId:string,peerId:string,beforeId?:string,limit=50) {
    const scope = this.scope(schoolId,userId,peerId);
    const cursor:any = beforeId ? await Model.findOne({...scope,id:beforeId}).lean() : null;
    if (beforeId && !cursor) return [];
    const filter = cursor ? {$and:[scope,{$or:[{createdAt:{$lt:cursor.createdAt}},{createdAt:cursor.createdAt,id:{$lt:cursor.id}}]}]} : scope;
    return (await Model.find(filter).sort({createdAt:-1,id:-1}).limit(limit).lean()).map(clean);
  }
  async markRead(schoolId:string,userId:string,peerId:string,throughId:string,readAt:string) {
    const cursor:any = await Model.findOne({...this.scope(schoolId,userId,peerId),id:throughId}).lean();
    if (!cursor) return;
    await Model.updateMany({schoolId,recipientId:userId,senderId:peerId,readAt:null,$or:[{createdAt:{$lt:cursor.createdAt}},{createdAt:cursor.createdAt,id:{$lte:cursor.id}}]},{$set:{readAt}});
  }
}
