import packageJson from '../../package.json'
export const dmappId = packageJson.dmappId
enum ActionName {
    UnloadSelf = "UnloadSelf",
    UnloadDMApp = "UnloadDMApp",
    CallAppReq = "CallAppReq",
    CallAppResp = "CallAppResp",
    StartDMApp = "StartDMApp",
    GetPubKey = "GetPubKey",
    Sign = "Sign",
    Authentication = "Authentication",
    Ping = "Ping"
}

function postAction(args: {
    name: string,
    args: any,
}) {
    window.parent.postMessage(args);
}
export function UnloadSelf() {
    if (window.parent) {
        let appUrl = new URL(location.href);

        postAction({
            name: ActionName.UnloadSelf,
            args: {
                dmappId: appUrl.pathname.replace("/dmapp/", ""),
                startId: appUrl.searchParams.get('startId'),
                fromDmappId: appUrl.searchParams.get("fromDmappId"),
            }
        });
    }
}

interface Action {
    name: string
    args: any,
}
interface UnloadDMAppAction {
    fromDAppId: string
}

interface CallAppReq {
    fromDmappId: string,
    //空时发给zdan
    toDmappId?: string,
    callId: number,
    action: string,
    args: any,
}
interface CallAppResp {
    callId: number,
    err?: any,
    result?: any,
}


interface CallAppRespContext {
    ok: (args: any) => void
    failed: (err: any) => void
}
interface CallAppReqCallback {
    onAction: (args: any) => Promise<any>;
}
class ActionManger {
    static actionManager = new ActionManger();
    public constructor() {
        let url = new URL(location.href);
        let startId = url.searchParams.get("startId");
        let fromDmappId = url.searchParams.get('fromDmappId');

        if (startId && fromDmappId) {
            url.searchParams.delete("startId");
            url.searchParams.delete("fromDmappId");
            this.CallAppAction(fromDmappId, startId, {});
            console.log('ActionManger', startId, fromDmappId);
        }
        window.addEventListener('message', async (event: MessageEvent<any>) => {
            let action: Action = event.data;
            if (action) {
                switch (action.name) {
                    case ActionName.CallAppReq: {
                        let callAppReq: CallAppReq = action.args;
                        if (callAppReq) {
                            if (callAppReq.action in this.dmappActionMap) {
                                let resp: CallAppResp = {
                                    callId: callAppReq.callId,
                                }
                                let actionCallback: CallAppReqCallback = this.dmappActionMap[callAppReq.callId];
                                resp.result = await actionCallback.onAction(callAppReq.args);
                                postAction({
                                    name: ActionName.CallAppResp,
                                    args: resp,
                                });
                            } else {
                                //没有找到action                            
                                let resp: CallAppResp = {
                                    callId: callAppReq.callId,
                                    err: `not found action:${callAppReq.action}`
                                }
                                postAction({
                                    name: ActionName.CallAppResp,
                                    args: resp,
                                });
                            }
                        }
                    } break;
                    case ActionName.UnloadDMApp: {
                        let unloadAcion: UnloadDMAppAction = event.data;
                        if (unloadAcion) {
                            console.log('unload by other', unloadAcion.fromDAppId)
                            UnloadSelf();
                        }
                    } break;
                    case ActionName.CallAppResp: {
                        let callAppResp: CallAppResp = action.args;
                        if (callAppResp) {
                            if (callAppResp.callId in this.callAppActionContextMap) {
                                let ctx = this.callAppActionContextMap[callAppResp.callId];
                                if (ctx) {
                                    if (callAppResp.err) {
                                        ctx.failed(callAppResp.err);
                                    } else {
                                        ctx.ok(callAppResp.result);
                                    }
                                }
                            }
                        }
                    } break;
                }
            }
        })
    }
    //CallApp promise 的callback
    private callAppActionContextMap: {
        [key: number]: CallAppRespContext
    } = {};
    //dmapp 注册的action
    dmappActionMap: {
        [key: string]: CallAppReqCallback
    } = {}

    public RegisterAction(action: string, callback: CallAppReqCallback) {
        if (action in this.dmappActionMap) {
            throw `action:${action} registered`;
        }
        this.dmappActionMap[action] = callback;
    }
    public UnregisterAction(action: string) {
        delete this.dmappActionMap[action];
    }
    /**
    * 
    * @param dmappId 被调用的dmapp id
    * @param action 导出的接口名
    * @param args 传入参数
    * @returns 接口返回值
    */
    async CallAppAction(dmappId: string, action: string, args: any): Promise<any> {
        return new Promise<any>((ok, failed) => {
            let callAppReq: CallAppReq = {
                fromDmappId: packageJson.dmappId,
                toDmappId: dmappId,
                callId: Date.now(),
                action: action,
                args: args,
            }
            this.callAppActionContextMap[callAppReq.callId] = {
                ok, failed,
            }
            postAction({
                name: ActionName.CallAppReq,
                args: callAppReq,
            })
        });
    }

    public async LoadDMApp(dmappId: string, args: any) {
        return this.CallAppAction('', ActionName.StartDMApp, {
            dmappId, args,
        });
    }
}


export default ActionManger.actionManager;


export async function GetPubKey(): Promise<Uint8Array> {
    return ActionManger.actionManager.CallAppAction('', ActionName.GetPubKey, {});
}

export async function Sign(data: Uint8Array): Promise<Uint8Array> {
    return ActionManger.actionManager.CallAppAction('', ActionName.Sign, {
        data,
    });
}

export enum AuthenticationType{
    //企业认证
    EnterpriseAuth = 2,
    //个人认证
    PersonAuth = 3,
}
export interface AuthenticationPersonResult{
    realName:string,
    idNumber:string,
    phone:string,
    bank_name:string,
    bank_num:string,
}
export interface AuthenticationEnterpriseResult{
    app_id:number,
    area_code:string,
    address:string,
    business_scope:string,
    created_at:string,
    corporate_name:string,
    legal_person:string,
    legal_cert_id:string,
    legal_cert_id_expires:string,
    legal_mp: string,
    mch_id: string,
    message: string,
    prov_code: string,
    pic: string,
    req_no: string,
    social_credit_code: string,
    social_credit_code_expires: string,
    status: number,
    settle_account_id: string,
    up_status: number
    updated_at: number
    uid:number,
    node_id:string,
    initiator_code:string,
    area_proxy: any,
    area_name: string
}
/**
 * 个人认证，或者企业认证
 */
export async function Authentication(type:AuthenticationType):Promise<AuthenticationPersonResult|AuthenticationEnterpriseResult> {
    return ActionManger.actionManager.CallAppAction('', ActionName.Authentication, {
        type,
    });
}

export function Uint8Array2Base64(arr: Uint8Array) {
    return btoa(String.fromCharCode(...arr))
}
export function Base642Uint8Array(base64: string) {
    const binaryString = atob(base64)
    const len = binaryString.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes
}

declare var window:any;

window.ActionPing = async ()=>{
    let start = performance.now();
    await ActionManger.actionManager.CallAppAction('',ActionName.Ping,{})
    console.log(`ActionPing use:${performance.now() - start} ms`)
}