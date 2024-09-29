import { Injectable, OnDestroy } from '@angular/core';
import { WebSocketService } from './web-socket.service';
import { Hello } from '../models/hello';
import { ClientListResponse, sanitizeClientListResponse } from '../models/client-list-response';
import { CryptoService } from './crypto.service';
import { BehaviorSubject, combineLatestWith, interval, subscribeOn, Subscription } from 'rxjs';
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
  private resendClientRequestSubscription!: Subscription;

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

    // Update client list when a new client list is recieved
    this.messageRecievedSubscription = this.webSocketService.messageRecieved$.subscribe(
      this.checkForClientListUpdate
    );

    // Send a client request every 5 seconds
    this.resendClientRequestSubscription = interval(5000).subscribe(this.sendClientRequest)

  }

  ngOnDestroy(): void {
    this.sendHelloSubscription.unsubscribe();
    this.messageRecievedSubscription.unsubscribe();
    this.resendClientRequestSubscription.unsubscribe();
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

  private async checkForClientListUpdate(message: any){
    if (!(message && message.type && message.type === "client_list")) return;
        
      const clientListResponse = sanitizeClientListResponse(message)
      if (!clientListResponse) return;
      
      await this.processClientListResponse(clientListResponse)
  }

  // Replaces the list of online clients with the list of clients in the
  // client list response
  // Resends server hello & client request if the client's public key is not in the 
  // client list response.
  private async processClientListResponse(list: ClientListResponse){

    console.log("Adding clients from: ", list)

    // List to replace old client list
    let newClientList: Client[] = []

    const userPublicKey = await this.cryptoService.getPublicKeyBase64();

    let containsUser = false;

    // Add each user
    for (const server of list.servers){
      for (const client of server.clients){
        const clientPublicKey = this.cryptoService.pemToBase64key(client);
        // Do not add self to online client list
        if (userPublicKey === clientPublicKey){
          containsUser = true;
        } else {
          newClientList.push({publicKey: client, serverAddress: server.address})
        }
      }
    }

    if (!containsUser){
      this.sendServerHello();
      this.sendClientRequest();
    }

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
