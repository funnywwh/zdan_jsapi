import { GetDMAppId } from './dmapp'
import { WSApi, Inteface } from "./ws_api";


export class MSService {
    private wsapi: WSApi
    private serviceName: string = ""
    private groupName: string = ""
    private groupId: string = ""
    public constructor(serviceName: string, groupName: string) {
        this.wsapi = new WSApi()
        this.serviceName = serviceName
        this.groupName = groupName

    }
    public async Open(data: any): Promise<string> {
        await this.wsapi.Open()
        this.groupId = await this.CreateAndJoin(this.serviceName, this.groupName, data)
        return this.groupId
    }
    public async Close() {
        await this.LeaveGroup(this.serviceName, this.groupName)
        return this.wsapi.Close()
    }
    public async Call(name: string, args: any): Promise<any> {
        return this.SendMsg({
            name: name,
            args: args,
        })
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
    private async CreateAndJoin(serviceName: string, groupName: string, data: any): Promise<string> {
        interface Result {
            groupId: string,
        }
        let result: Result = await this.wsapi.Call(Inteface.CreateAndJoinGroup, {
            cookie: this.auth(),
            dmappIdHex: GetDMAppId(),
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
            dmappIdHex: GetDMAppId(),
            data: data,
        })
        return result;
    }
    private async LeaveGroup(serviceName: string, groupName: string): Promise<any> {
        let result = this.wsapi.Call(Inteface.LeaveGroup, {
            dmappIdHex: GetDMAppId(),
            serviceName: serviceName,
            groupName: groupName,
        })
        return result;
    }
}