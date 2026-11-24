import {AcademicController} from '../../src/infrastructure/http/controllers/AcademicController';
it('accepts an empty deactivation body and forwards the authenticated actor to the authorization layer',async()=>{
 const actor={userId:'admin',schoolId:'school',role:'ADMIN'};
 const deactivate=jest.fn().mockResolvedValue({id:'assignment',isActive:false});
 const controller=new AcademicController({deactivateSubjectTeacherAssignment:deactivate} as any);
 const response:any={status:jest.fn().mockReturnThis(),json:jest.fn()};const next=jest.fn();
 await controller.deactivateSubjectTeacherAssignment({params:{id:'assignment'},user:actor,body:undefined} as any,response,next);
 expect(next).not.toHaveBeenCalled();expect(deactivate).toHaveBeenCalledWith('assignment',undefined,actor);expect(response.status).toHaveBeenCalledWith(200);
});
