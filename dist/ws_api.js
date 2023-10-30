import { GetDMAppId } from './dmapp';
const MD5 = require('md5');
export var Inteface;
(function (Inteface) {
    Inteface["CreateAndJoinGroup"] = "/microsvc/createAndJoinGroup";
    Inteface["SendMsg"] = "/microsvc/sendMsg";
    Inteface["LeaveGroup"] = "/microsvc/leaveGroup";
})(Inteface || (Inteface = {}));
export class WSApi {
    constructor() {
        Object.defineProperty(this, "callbackMap", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
        Object.defineProperty(this, "socket", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "pingTiemrId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "closed", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: true
        });
    }
    async connect() {
        return new Promise((ok) => {
            let url = new URL(location.href);
            let socketProtocol = (url.protocol === 'https:') ? 'wss' : 'ws';
            url.host = 'dmapp.zdan.cloud:13915';
            socketProtocol = 'wss';
            this.socket = new WebSocket(`${socketProtocol}://${url.host}/ws`);
            this.socket.onopen = () => {
                ok({});
                this.pingTiemrId = setInterval(() => {
                    if (this.socket?.readyState === WebSocket.OPEN) {
                        this.socket.send('ping');
                    }
                }, 1000 * 30);
            };
            this.socket.onclose = () => {
            };
            this.socket.onerror = (ev) => {
                console.log(ev);
                clearInterval(this.pingTiemrId);
                if (!this.closed) {
                    if (this.socket?.readyState !== WebSocket.OPEN) {
                        setTimeout(() => {
                            try {
                                this.socket?.close();
                                this.connect();
                            }
                            catch (e) {
                                console.log(e);
                            }
                        }, 1000 * 5); // 5秒后重试          
                    }
                }
            };
            this.socket.onmessage = (ev) => {
                let result = JSON.parse(ev.data);
                if (result) {
                    let callbackId = result.callbackId;
                    let callback = this.callbackMap.get(callbackId);
                    if (callback) {
                        callback(result);
                    }
                }
            };
        });
    }
    async Open() {
        this.closed = false;
        return await this.connect();
    }
    async Close() {
        if (this.socket?.readyState == WebSocket.OPEN) {
            this.socket.close();
        }
        this.closed = true;
    }
    async Call(_interface, data) {
        return new Promise((ok, failed) => {
            if (this.closed) {
                failed('socket closed');
            }
            let callbackId = MD5(`${GetDMAppId()}${Date.now}`).toString();
            const CALL_TIMEOUT_SECONDS = 30 * 1000;
            let timer = setTimeout(() => {
                let callback = this.callbackMap.get(callbackId);
                if (callback) {
                    callback({
                        callbackId,
                        code: -1,
                        describe: `call timeout after ${CALL_TIMEOUT_SECONDS}`,
                    });
                }
            }, CALL_TIMEOUT_SECONDS);
            let callback = (result) => {
                if (result.code == 0) {
                    ok(result.value);
                }
                else {
                    failed({
                        code: result.code,
                        describe: result.describe,
                    });
                }
                clearTimeout(timer);
            };
            this.callbackMap.set(callbackId, callback);
            data.interface = _interface;
            data.callBackId = callbackId;
            this.socket?.send(JSON.stringify(data));
        });
    }
}
