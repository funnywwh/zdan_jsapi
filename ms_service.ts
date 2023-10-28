import {dmappId} from './index'
import { WSApi,Inteface } from "./ws_api";

export class MSService{
    private wsapi:WSApi
    private serviceName:string
    private groupName:string
    private groupId:string
    public constructor(serviceName:string,groupName:string){
        this.wsapi = new WSApi()
        this.serviceName = serviceName
        this.groupName = groupName
    }
    public async Open(data:any){
        await this.wsapi.Open()
        this.groupId = await this.CreateAndJoin(this.serviceName,this.groupName,data)
        return 
    }
    public async Close(){
        await this.LeaveGroup(this.serviceName,this.groupName)
        return this.wsapi.Close()
    }
    public async Call(data:any):Promise<any>{
        return this.SendMsg(data)
    }

    private auth = () => {
        const cookies = document.cookie.split(';')
        for (const cookie of cookies) {
            const [name, value] = cookie.trim().split('=')
            if (name === 'auth') {
                if (value.length === 40) {
                    return value
                }
            }
        }
        return ''
    }
    async CreateAndJoin(serviceName: string, groupName: string, data: any): Promise<string> {
        interface Result {
            groupId: string,
        }
        let result: Result = await this.wsapi.Call(Inteface.CreateAndJoinGroup, {
            cookie:this.auth(),
            dmappIdHex: dmappId,
            serviceName: serviceName,
            groupName: groupName,
            userInfo: data,
        })
        if (result) {
            return result.groupId
        }
        throw `join failed`
    }
    async SendMsg(data: any): Promise<any> {
        let result = this.wsapi.Call(Inteface.SendMsg, {
            dmappIdHex: dmappId,
            data: data,
        })
        return result;
    }
    async LeaveGroup(serviceName: string, groupName: string): Promise<any> {
        let result = this.wsapi.Call(Inteface.LeaveGroup, {
            dmappIdHex: dmappId,
            serviceName: serviceName,
            groupName: groupName,
        })
        return result;
    }    
}