import { Injectable, OnDestroy } from '@angular/core';
import { WebSocketService } from './web-socket.service';
import { Hello } from '../models/hello';
import { ClientListResponse, sanitizeClientListResponse } from '../models/client-list-response';
import { CryptoService } from './crypto.service';
import { BehaviorSubject, combineLatestWith, interval, subscribeOn, Subscription } from 'rxjs';
import { Client } from '../models/client';

@Injectable({
  providedIn: 'root'
})
export class ClientService implements OnDestroy {


  private sendHelloSubscription!: Subscription;
  private messageRecievedSubscription!: Subscription;
  private resendClientRequestSubscription!: Subscription;

  private _onlineClients = new BehaviorSubject<Array<Client>>([])
  public readonly onlineClients$ = this._onlineClients.asObservable();
  
  private _selectedClientSubject = new BehaviorSubject<Set<string>>(new Set(["public"]));
  public selectedClients$ = this._selectedClientSubject.asObservable();

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
      message => this.checkForClientListUpdate(message)
    );

    // Send a client request every 5 seconds
    this.resendClientRequestSubscription = interval(5000).subscribe(
      ()=>this.sendClientRequest()
    )

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

  private async checkForClientListUpdate(message: any){
    if (!(message && message.type && message.type === "client_list")) return;
        
      const clientListResponse = sanitizeClientListResponse(message)
      if (!clientListResponse) return;
      
      await this.processClientListResponse(clientListResponse)
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

  // Adds the client to the set of selected if it is not in the set,
  // otherwise removes the client from the set
  public toggleSelectedClient(client: string){

    let selectedClients = this._selectedClientSubject.getValue()

    // If setting to public chat, replace all with public
    // A group cannot contain public
    if (client === "public"){
      this._selectedClientSubject.next(new Set(["public"]));
    }

    // Check that the client is in the array of online clients
    if (!this._onlineClients.getValue().find(x => x.publicKey === client)) return;

    // Clear public if it is in the list of selected clients
    // If public is in the list of selected clients it should always be the only selected client
    if (selectedClients.has("public")){
      selectedClients.clear()
    }

    // Toggle
    if (selectedClients.has(client)) selectedClients.delete(client);
    else selectedClients.add(client);

    this._selectedClientSubject.next(selectedClients);
  }

}
