export function init(dmappId) {
    DMAppId.dmappId = dmappId;
    console.log(`zdan_jsapi dmappId:${dmappId}`);
}
export function GetDMAppId() {
    return DMAppId.dmappId;
}
class DMAppId {
}
Object.defineProperty(DMAppId, "dmappId", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: ""
});
var ActionName;
(function (ActionName) {
    ActionName["UnloadSelf"] = "UnloadSelf";
    ActionName["UnloadDMApp"] = "UnloadDMApp";
    ActionName["CallAppReq"] = "CallAppReq";
    ActionName["CallAppResp"] = "CallAppResp";
    ActionName["StartDMApp"] = "StartDMApp";
    ActionName["GetPubKey"] = "GetPubKey";
    ActionName["Sign"] = "Sign";
    ActionName["Authentication"] = "Authentication";
    ActionName["Ping"] = "Ping";
})(ActionName || (ActionName = {}));
function postAction(args) {
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
class ActionManger {
    constructor() {
        //CallApp promise 的callback
        Object.defineProperty(this, "callAppActionContextMap", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: {}
        });
        //dmapp 注册的action
        Object.defineProperty(this, "dmappActionMap", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: {}
        });
        let url = new URL(location.href);
        let startId = url.searchParams.get("startId");
        let fromDmappId = url.searchParams.get('fromDmappId');
        if (startId && fromDmappId) {
            url.searchParams.delete("startId");
            url.searchParams.delete("fromDmappId");
            this.CallAppAction(fromDmappId, startId, {});
            console.log('ActionManger', startId, fromDmappId);
        }
        window.addEventListener('message', async (event) => {
            let action = event.data;
            if (action) {
                switch (action.name) {
                    case ActionName.CallAppReq:
                        {
                            let callAppReq = action.args;
                            if (callAppReq) {
                                if (callAppReq.action in this.dmappActionMap) {
                                    let resp = {
                                        callId: callAppReq.callId,
                                    };
                                    let actionCallback = this.dmappActionMap[callAppReq.callId];
                                    resp.result = await actionCallback.onAction(callAppReq.args);
                                    postAction({
                                        name: ActionName.CallAppResp,
                                        args: resp,
                                    });
                                }
                                else {
                                    //没有找到action                            
                                    let resp = {
                                        callId: callAppReq.callId,
                                        err: `not found action:${callAppReq.action}`
                                    };
                                    postAction({
                                        name: ActionName.CallAppResp,
                                        args: resp,
                                    });
                                }
                            }
                        }
                        break;
                    case ActionName.UnloadDMApp:
                        {
                            let unloadAcion = event.data;
                            if (unloadAcion) {
                                console.log('unload by other', unloadAcion.fromDAppId);
                                UnloadSelf();
                            }
                        }
                        break;
                    case ActionName.CallAppResp:
                        {
                            let callAppResp = action.args;
                            if (callAppResp) {
                                if (callAppResp.callId in this.callAppActionContextMap) {
                                    let ctx = this.callAppActionContextMap[callAppResp.callId];
                                    if (ctx) {
                                        if (callAppResp.err) {
                                            ctx.failed(callAppResp.err);
                                        }
                                        else {
                                            ctx.ok(callAppResp.result);
                                        }
                                    }
                                }
                            }
                        }
                        break;
                }
            }
        });
    }
    RegisterAction(action, callback) {
        if (action in this.dmappActionMap) {
            throw `action:${action} registered`;
        }
        this.dmappActionMap[action] = callback;
    }
    UnregisterAction(action) {
        delete this.dmappActionMap[action];
    }
    /**
    *
    * @param dmappId 被调用的dmapp id
    * @param action 导出的接口名
    * @param args 传入参数
    * @returns 接口返回值
    */
    async CallAppAction(dmappId, action, args) {
        return new Promise((ok, failed) => {
            let callAppReq = {
                fromDmappId: dmappId,
                toDmappId: dmappId,
                callId: Date.now(),
                action: action,
                args: args,
            };
            this.callAppActionContextMap[callAppReq.callId] = {
                ok, failed,
            };
            postAction({
                name: ActionName.CallAppReq,
                args: callAppReq,
            });
        });
    }
    async LoadDMApp(dmappId, args) {
        return this.CallAppAction('', ActionName.StartDMApp, {
            dmappId, args,
        });
    }
}
Object.defineProperty(ActionManger, "actionManager", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: new ActionManger()
});
export default ActionManger.actionManager;
export async function GetPubKey() {
    return ActionManger.actionManager.CallAppAction('', ActionName.GetPubKey, {});
}
export async function Sign(data) {
    return ActionManger.actionManager.CallAppAction('', ActionName.Sign, {
        data,
    });
}
export var AuthenticationType;
(function (AuthenticationType) {
    //企业认证
    AuthenticationType[AuthenticationType["EnterpriseAuth"] = 2] = "EnterpriseAuth";
    //个人认证
    AuthenticationType[AuthenticationType["PersonAuth"] = 3] = "PersonAuth";
})(AuthenticationType || (AuthenticationType = {}));
/**
 * 个人认证，或者企业认证
 */
export async function Authentication(type) {
    return ActionManger.actionManager.CallAppAction('', ActionName.Authentication, {
        type,
    });
}
export function Uint8Array2Base64(arr) {
    return btoa(String.fromCharCode(...arr));
}
export function Base642Uint8Array(base64) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}
window.ActionPing = async () => {
    let start = performance.now();
    await ActionManger.actionManager.CallAppAction('', ActionName.Ping, {});
    console.log(`ActionPing use:${performance.now() - start} ms`);
};
