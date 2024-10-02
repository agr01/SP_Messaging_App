import { Injectable, OnDestroy } from '@angular/core';
import { WebSocketService } from './web-socket.service';
import { Hello } from '../models/hello';
import { ClientListResponse, sanitizeClientListResponse } from '../models/client-list-response';
import { CryptoService } from './crypto.service';
import { BehaviorSubject, combineLatestWith, interval, subscribeOn, Subscription } from 'rxjs';
import { Client } from '../models/client';
import { SignedDataService } from './signed-data.service';


// Manages online recipients and recipients selected in the sidebar

@Injectable({
  providedIn: 'root'
})
export class RecipientService implements OnDestroy {


  private sendHelloSubscription!: Subscription;
  private messageRecievedSubscription!: Subscription;
  private resendClientRequestSubscription!: Subscription;

  private _onlineClients = new BehaviorSubject<Array<Client>>([])
  public readonly onlineClients$ = this._onlineClients.asObservable();
  
  private _selectedRecipientFingerprintsSubject = new BehaviorSubject<Set<string>>(new Set(["public"]));
  public selectedRecipientFingerprints$ = this._selectedRecipientFingerprintsSubject.asObservable();

  constructor(
    private webSocketService: WebSocketService,
    private cryptoService: CryptoService,
    private signedDataService: SignedDataService
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

    this.signedDataService.sendAsSignedData(helloData);
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
    
    // List to replace old client list
    let newClientList: Client[] = []
    // set to check whether each client is unique
    let uniqueClients = new Set<string>();

    const userPublicKey = await this.cryptoService.generateUserPublicKeyPem();

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
        
        // Do not add duplicate clients
        if (uniqueClients.has(clientPublicKey)) continue;
        
        // Add client
        uniqueClients.add(clientPublicKey);
        const fingerprint = await this.cryptoService.getFingerprint(clientPublicKey);
        newClientList.push({
          fingerprint: fingerprint,
          publicKey: clientPublicKey, 
          serverAddress: server.address
        })

        // Add client to selected recipients if selected
        const selectedRecipients = this.getSelectedRecipientFingerprints();
        if (selectedRecipients.has(fingerprint)) newSelectedRecipients.add(fingerprint);
      }
    }

    // Resend hello & client request if clients does not contain sefl
    if (!containsUser){
      this.sendHello();
      this.sendClientRequest();
    }

    // update online client list
    this._onlineClients.next(newClientList);

    // update selected recipients based on online client list
    this.updateSelectedRecipients(newSelectedRecipients);
  }

 
  // Adds the client to the set of selected if it is not in the set,
  // otherwise removes the client from the set
  public toggleSelectedRecipient(clientFingerprint: string){

    let selectedRecipientFingerprints = this.getSelectedRecipientFingerprints();

    // If setting to public chat, replace all with public
    // A group cannot contain public
    if (clientFingerprint === "public"){
      this._selectedRecipientFingerprintsSubject.next(new Set(["public"]));
    }

    // Check that the client is in the array of online clients
    if (!this._onlineClients.getValue().find(x => x.fingerprint === clientFingerprint)) return;

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
    else selectedRecipientFingerprints.add(clientFingerprint);

    this.updateSelectedRecipients(selectedRecipientFingerprints);
  }

  public getSelectedRecipientFingerprints(){
    return this._selectedRecipientFingerprintsSubject.getValue();
  }

  // Updates the set of selected recipient fingerprints
  private updateSelectedRecipients(newSelectedRecipients: Set<string>){
    // Select public if new selected recipients is empty
    if (newSelectedRecipients.size == 0) newSelectedRecipients.add("public");

    this._selectedRecipientFingerprintsSubject.next(newSelectedRecipients);
  }

  // Returns an array of recipients that are selected in the sidebar
  public getSelectedRecipients(): Client[]{
    const selectedRecipientFingerprints = this._selectedRecipientFingerprintsSubject.value;
    const onlineClients = this._onlineClients.value;

    let selectedClients = new Array<Client>

    for (const client of onlineClients){
      if (selectedRecipientFingerprints.has(client.fingerprint)){
        selectedClients.push(client);
      }
    }

    return selectedClients;
  }

  // Returns true if public is selected as the message recipient
  public publicRecipientSelected(): boolean{
    return this._selectedRecipientFingerprintsSubject.value.has("public");
  }

}
