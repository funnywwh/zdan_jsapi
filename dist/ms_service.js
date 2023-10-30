import { GetDMAppId } from './dmapp';
import { WSApi, Inteface } from "./ws_api";
export class MSService {
    constructor(serviceName, groupName) {
        Object.defineProperty(this, "wsapi", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "serviceName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: ""
        });
        Object.defineProperty(this, "groupName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: ""
        });
        Object.defineProperty(this, "groupId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: ""
        });
        Object.defineProperty(this, "auth", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: () => {
                // const cookies = document.cookie.split(';')
                // for (const cookie of cookies) {
                //     const [name, value] = cookie.trim().split('=')
                //     if (name === 'auth') {
                //         if (value.length === 40) {
                //             return value
                //         }
                //     }
                // }
                // return ''
                let url = new URL(location.href);
                let auth = url.searchParams.get('auth');
                return auth;
            }
        });
        this.wsapi = new WSApi();
        this.serviceName = serviceName;
        this.groupName = groupName;
    }
    async Open(data) {
        await this.wsapi.Open();
        this.groupId = await this.CreateAndJoin(this.serviceName, this.groupName, data);
        return this.groupId;
    }
    async Close() {
        await this.LeaveGroup(this.serviceName, this.groupName);
        return this.wsapi.Close();
    }
    async Call(name, args) {
        return this.SendMsg({
            name: name,
            args: args,
        });
    }
    async CreateAndJoin(serviceName, groupName, data) {
        let result = await this.wsapi.Call(Inteface.CreateAndJoinGroup, {
            cookie: this.auth(),
            dmappIdHex: GetDMAppId(),
            serviceName: serviceName,
            groupName: groupName,
            userInfo: data,
        });
        if (result) {
            return result.groupId;
        }
        throw `join failed`;
    }
    async SendMsg(data) {
        let result = this.wsapi.Call(Inteface.SendMsg, {
            dmappIdHex: GetDMAppId(),
            data: data,
        });
        return result;
    }
    async LeaveGroup(serviceName, groupName) {
        let result = this.wsapi.Call(Inteface.LeaveGroup, {
            dmappIdHex: GetDMAppId(),
            serviceName: serviceName,
            groupName: groupName,
        });
        return result;
    }
}
