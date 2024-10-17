// Group 51: William Godfrey (a1743033) Alexandra Gramss (a1756431)
import { Injectable, OnDestroy } from '@angular/core';
import { WebSocketService } from './web-socket.service';
import { Hello } from '../models/hello';
import { ClientListResponse, sanitizeClientListResponse } from '../models/client-list-response';
import { CryptoService } from './crypto.service';
import { BehaviorSubject, combineLatestWith, interval, subscribeOn, Subscription } from 'rxjs';
import { Client } from '../models/client';
import { SignedData } from '../models/signed-data';
import { MAX_GROUP_CHAT_SIZE } from '../constants';


// Manages online recipients and recipients selected in the sidebar

@Injectable({
  providedIn: 'root'
})
export class RecipientService implements OnDestroy {


  private sendHelloSubscription!: Subscription;
  private messageRecievedSubscription!: Subscription;
  private resendClientRequestSubscription!: Subscription;

  // Maps public keys to client objects
  private _onlineClientsSubject = new BehaviorSubject<Map<string, Client>>(new Map<string, Client>);
  public readonly onlineClients$ = this._onlineClientsSubject.asObservable();
  
  // Tracks recipients selected in the sidebar
  private _selectedRecipients = new BehaviorSubject<Set<string>>(new Set(["public"]));
  public selectedRecipients$ = this._selectedRecipients.asObservable();

  constructor(
    private webSocketService: WebSocketService,
    private cryptoService: CryptoService,
  ) { 
    
    // Send the server hello message once both the connection is established and the 
    // RSA keys are generated
    this.sendHelloSubscription = 
    this.webSocketService.connectionIsOpen$.pipe(
      combineLatestWith(this.cryptoService.rsaKeysGenerated$)
    ).subscribe(
      ([webSocketOpen, rsaKeyGenerated]) =>{

        if (webSocketOpen && rsaKeyGenerated){
          this.sendHello();
          this.sendClientRequest();
        }

      }
    );

    // Update client list when a new client list is recieved
    this.messageRecievedSubscription = this.webSocketService.messageRecieved$.subscribe(
      message => this.checkForClientListUpdate(message)
    );

    // Send a client request every 10 seconds
    this.resendClientRequestSubscription = interval(10000).subscribe(
      ()=>this.sendClientRequest()
    )

  }

  // Deconstructor - Unsubscribes from observables
  ngOnDestroy(): void {
    this.sendHelloSubscription.unsubscribe();
    this.messageRecievedSubscription.unsubscribe();
    this.resendClientRequestSubscription.unsubscribe();
  }

  // Sends a hello message to the server
  private async sendHello(){
    let helloData = {} as Hello;

    helloData.type = "hello";
    helloData.public_key = await this.cryptoService.generateUserPublicKeyPem();

    const signedData = await this.cryptoService.signData(helloData);

    this.webSocketService.send(signedData);
  }

  // Sends a client list request message to the server
  private sendClientRequest(){
    this.webSocketService.send({ type: "client_list_request"});
  }
  
  // Checks whether the incoming message is a valid clientListUpdate & calls
  // process function accordingly
  private async checkForClientListUpdate(message: any){
    if (!(message && message.type && message.type === "client_list")) return;
        
      const clientListResponse = sanitizeClientListResponse(message)
      if (!clientListResponse) return;
      
      await this.processClientListResponse(clientListResponse)
  }

  // Replaces the list of online clients with the list of clients in the
  // client list response while ensuring that each client appears only once
  // Resends server hello & client request if the client's public key is not in the 
  // client list response.
  private async processClientListResponse(list: ClientListResponse){
    
    const userPublicKey = await this.cryptoService.generateUserPublicKeyPem();

    let newOnlineClients = new Map<string, Client>;

    let containsUser = false;

    let newSelectedRecipients = new Set<string>

    // Add each client
    for (const server of list.servers){
      for (const clientPublicKey of server.clients){
                
        // Do not add self to online client list
        if (userPublicKey === clientPublicKey){
          containsUser = true;
          continue;
        } 

        // Check for an existing client
        let client = this._onlineClientsSubject.value.get(clientPublicKey);

        // If client does not exist, creat a new one
        if (!client){
          const fingerprint = await this.cryptoService.getFingerprint(clientPublicKey);

          client = {
            fingerprint: fingerprint,
            publicKey: clientPublicKey,
            serverAddress: server.address,
            counter: -1
          }
        }
        // If client exists - only update server address
        // Counter, public key & fingerprint must stay the same
        else{
          client.serverAddress = server.address;
        }

        // Add client to new online clients list
        newOnlineClients.set(clientPublicKey, client);

        // Add client to selected recipients if selected
        const selectedRecipients = this._selectedRecipients.value;
        if (selectedRecipients.has(client.fingerprint)) newSelectedRecipients.add(client.fingerprint);
     
      }
    }

    // Resend hello & client request if clients does not contain self
    if (!containsUser){
      this.sendHello();
      this.sendClientRequest();
    }

    // update online client list
    this._onlineClientsSubject.next(newOnlineClients);

    // update selected recipients based on online client list
    this.updateSelectedRecipients(newSelectedRecipients);
  }

 
  // Adds the client to the set of selected if it is not in the set,
  // otherwise removes the client from the set
  public toggleSelectedRecipient(clientFingerprint: string){

    let selectedRecipientFingerprints = this.getSelectedRecipientPubKeys();

    // If setting to public chat, replace all with public
    // A group cannot contain public
    if (clientFingerprint === "public"){
      this._selectedRecipients.next(new Set(["public"]));
      return;
    }

    // Clear public if it is in the list of selected clients
    // If public is in the list of selected clients it should always be the only selected client
    if (selectedRecipientFingerprints.has("public")){
      selectedRecipientFingerprints.clear()
    }

    // Toggle
    if (selectedRecipientFingerprints.has(clientFingerprint)) {
      selectedRecipientFingerprints.delete(clientFingerprint);
      // If selected clients is empty - default to public
      if (selectedRecipientFingerprints.size < 1) selectedRecipientFingerprints.add("public")
    }
    // Limit participants by max group chat size
    else if (selectedRecipientFingerprints.size < MAX_GROUP_CHAT_SIZE) 
      selectedRecipientFingerprints.add(clientFingerprint);

    this.updateSelectedRecipients(selectedRecipientFingerprints);
  }

  public getSelectedRecipientPubKeys(){
    return this._selectedRecipients.value;
  }

  // Updates the set of selected recipient fingerprints
  private updateSelectedRecipients(newSelectedRecipients: Set<string>){
    // Select public if new selected recipients is empty
    if (newSelectedRecipients.size == 0) newSelectedRecipients.add("public");

    this._selectedRecipients.next(newSelectedRecipients);
  }

  // Returns an array of recipients that are selected in the sidebar
  public getSelectedRecipients(): Client[]{
    const selectedRecipients = this._selectedRecipients.value;

    let selectedClients = new Array<Client>

    for (const client of this._onlineClientsSubject.value){
      if (selectedRecipients.has(client[1].fingerprint)){
        selectedClients.push(client[1]);
      }
    }

    return selectedClients;
  }

  // Returns true if public is selected as the message recipient
  public publicRecipientSelected(): boolean{
    return this._selectedRecipients.value.has("public");
  }

  public getClientByFingerprint(fingerprint: string): Client | undefined {
    for (const [pubKey, client] of this._onlineClientsSubject.value.entries()) {
      if (client.fingerprint === fingerprint) {
        return client;
      }
    }
    return undefined;
  }
  
  // Validates the sender's signature & counter
  public async validateSender(senderFingerprint: string, signedData: SignedData): Promise<boolean>{

    // Do not allow counters >= max safe int
    if (signedData.counter >= Number.MAX_SAFE_INTEGER)
      return false;
    
    // Validate signature
    let sender = this.getClientByFingerprint(senderFingerprint);
    if (!sender){
      console.error("Could not validate sender.\nSender is not in list of online clients.");
      return false;
    }

    const dataToValidate = JSON.stringify(signedData.data) + signedData.counter.toString();
    
    const verified = await this.cryptoService.validateSignature(sender.publicKey, dataToValidate, signedData.signature);

    if (!verified){
      console.error("Could not verify message sender.");
      return false;
    }    

    // Validate counter
    if (signedData.counter <= sender.counter){
      console.error("Invalid message counter");
      return false;
    }
    
    // Update client's counter
    sender.counter = signedData.counter;
    this.addOrUpdateClient(sender);

    return true;
  }

  private addOrUpdateClient(client: Client){
    let newOnlineClients = this._onlineClientsSubject.value;
    newOnlineClients.set(client.publicKey, client);

    this._onlineClientsSubject.next(newOnlineClients);
  }

}
