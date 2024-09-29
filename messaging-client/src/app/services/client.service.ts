import { Injectable, OnDestroy } from '@angular/core';
import { WebSocketService } from './web-socket.service';
import { Hello } from '../models/hello';
import { ClientListResponse, sanitizeClientListResponse } from '../models/client-list-response';
import { CryptoService } from './crypto.service';
import { BehaviorSubject, combineLatestWith, Subscription } from 'rxjs';
import { Client } from '../models/client';

// The initial value of online clients
const onlineClientsInit: Client[] = [{
  publicKey: `-----BEGIN PUBLIC KEY-----
TESTCLIENTkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAyIENRUol8p4Gh5FJJwwD
/vXr9oV+OKdEHwkU0Sm4y6ULfpHHxtF/r7NAaXTmMM0dxpdcN4JT6J1pe7Ycg1xZ
ylS1Ff2fVc8+HdX+VQhyLP9RuxuWZo0KT9w5/GUsIPuQfbXOM9uakSM972+ZGgwC
XKd8UlUoiMCzwZ+cmIsEx+PW+nXL8YU5iwrFhAsGzlr5SI6HTdStjdSvqZU4sip2
zG91Ykv0QbvdAXGldnKAW0tt+8Wqs2uyquIYxsAc54+SJ2elbE0U5TkjHGPsY/jr
bC7G8P/wvq2+tdFmQiHEoFDOkcF+akhKqHYV6R996fIWfjDWJYL6EhQ/3OdRn6Us
OQIDAQAB
-----END PUBLIC KEY-----`,
  serverAddress: `localhost:3000`
}]

@Injectable({
  providedIn: 'root'
})
export class ClientService implements OnDestroy {

  private sendHelloSubscription!: Subscription;
  private messageRecievedSubscription!: Subscription;

  private _onlineClients = new BehaviorSubject(onlineClientsInit)
  public readonly onlineClients$ = this._onlineClients.asObservable();

  constructor(
    private webSocketService: WebSocketService,
    private cryptoService: CryptoService
  ) { 


    // Send the server hello message once both the connection is established and the 
    // RSA keys are generated
    this.sendHelloSubscription = 
    this.webSocketService.connectionIsOpen$.pipe(
      combineLatestWith(this.cryptoService.rsaKeysGenerated$)
    ).subscribe(
      ([webSocketOpen, rsaKeyGenerated]) =>{

        if (webSocketOpen && rsaKeyGenerated){
          console.log("Sending hello");
          this.sendServerHello();
          this.sendClientRequest();
        }

      }
    );

    this.messageRecievedSubscription = this.webSocketService.messageRecieved$.subscribe(
      
      async (message: any) => {
        const clientListResponse = sanitizeClientListResponse(message)

        if (clientListResponse !== null){
          this.addClientsFromList(clientListResponse)
          
          if (!(await this.containsSelf(clientListResponse))){
            console.log("Client list does not contain self, resending hello and list request");
            this.sendServerHello();
            this.sendClientRequest();
          }
          else{
            console.log("client list contains self");
            
          }
        }
      }

    );

  }

  ngOnDestroy(): void {
    this.sendHelloSubscription.unsubscribe();
    this.messageRecievedSubscription.unsubscribe();
  }

  private async sendServerHello(){

    let helloData = {} as Hello;

    helloData.type = "hello";
    helloData.public_key = await this.cryptoService.getPublicKeyPem();

    this.webSocketService.sendAsData(helloData);
  }

  private sendClientRequest(){

    this.webSocketService.send({ type: "client_list_request"});
  }

  // Replaces the list of online clients with the list of clients in the
  // client list response
  private addClientsFromList(list: ClientListResponse){

    console.log("Adding clients from: ", list)

    let newClientList: Client[] = []

    for (const server of list.servers){
      for (const client of server.clients){
        newClientList.push({publicKey: client, serverAddress: server.address})
      }
    }

    console.log()

    this._onlineClients.next(newClientList);
  }

  private async containsSelf(list: ClientListResponse): Promise<boolean>{
    let ownPublicKey = await this.cryptoService.getPublicKeyBase64()


    for (const server of list.servers){
      const keyMatch = server.clients.find(client => this.cryptoService.pemToBase64key(client) === ownPublicKey)
      
      if (keyMatch){
        console.log("found match", keyMatch)
        return true;
      }

    }
    
    return false;
  }

}
