import {GetDMAppId} from './dmapp'
const MD5 = require('md5')

export enum Inteface {
    CreateAndJoinGroup = "/microsvc/createAndJoinGroup",
    SendMsg = "/microsvc/sendMsg",
    LeaveGroup = "/microsvc/leaveGroup"
}

export interface CallbackResult {
    callbackId: string
    code: number,
    describe?: string,
    value?: string,
}
interface Callback {
    (result: CallbackResult):void
}


export class WSApi {
    private callbackMap: Map<string, Callback> = new Map()
    private socket?: WebSocket
    private pingTiemrId: any
    private closed: boolean = true

    public constructor() {
    }
    private async connect(): Promise<any> {
        return new Promise((ok) => {
            let url = new URL(location.href)
            let socketProtocol = (url.protocol === 'https:') ? 'wss' : 'ws'
            url.host = 'dmapp.zdan.cloud:13915';
            socketProtocol = 'wss';
            this.socket = new WebSocket(`${socketProtocol}://${url.host}/ws`)
            this.socket.onopen = () => {
                ok({})
                this.pingTiemrId = setInterval(() => {
                    if (this.socket?.readyState === WebSocket.OPEN) {
                        this.socket.send('ping')
                    }
                }, 1000 * 30)
            }
            this.socket.onclose = () => {

            }
            this.socket.onerror = (ev:Event) => {                
                console.log(ev);
                clearInterval(this.pingTiemrId)
                if (!this.closed) {
                    if (this.socket?.readyState !== WebSocket.OPEN) {
                        setTimeout(() => {
                            try {
                                this.socket?.close()
                                this.connect()
                            } catch (e) {
                                console.log(e)
                            }
                        }, 1000 * 5)// 5秒后重试          
                    }
                }
            }
            this.socket.onmessage = (ev: MessageEvent) => {
                let result: CallbackResult = JSON.parse(ev.data)
                if (result) {
                    let callbackId = result.callbackId
                    let callback = this.callbackMap.get(callbackId)
                    if (callback) {
                        callback(result)
                    }
                }
            }

        })
    }
    public async Open() {
        this.closed = false
        return await this.connect()
    }
    public async Close() {
        if (this.socket?.readyState == WebSocket.OPEN) {
            this.socket.close()
        }
        this.closed = true
    }
    public async Call(_interface: Inteface, data: any): Promise<any> {
        return new Promise((ok, failed) => {
            if (this.closed) {
                failed('socket closed')
            }
            let callbackId = MD5(`${GetDMAppId()}${Date.now}`).toString()
            const CALL_TIMEOUT_SECONDS = 30 * 1000
            let timer = setTimeout(() => {
                let callback = this.callbackMap.get(callbackId);
                if (callback) {
                    callback({
                        callbackId,
                        code: -1,
                        describe: `call timeout after ${CALL_TIMEOUT_SECONDS}`,
                    })
                }
            }, CALL_TIMEOUT_SECONDS);
            let callback = (result: CallbackResult) => {
                if (result.code == 0) {
                    ok(result.value)
                } else {
                    failed({
                        code: result.code,
                        describe: result.describe,
                    })
                }
                clearTimeout(timer)
            }
            this.callbackMap.set(callbackId, callback)
            data.interface = _interface;
            this.socket?.send(JSON.stringify(data))
        })
    }
   
}