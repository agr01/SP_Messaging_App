import { Injectable } from '@angular/core';
import { Subject, BehaviorSubject} from 'rxjs';
import { Hello } from '../models/hello';
import { ChatData } from '../models/chat';
import { PublicChat } from '../models/public-chat';
import { SignedData } from '../models/signed-data';
import { CryptoService } from './crypto.service';




@Injectable({
  providedIn: 'root',
})
export class WebSocketService {
  
  // TODO: Put list of servers somewhere else
  private readonly URLs = ['ws://localhost:3000', 'ws://localhost:3001']
  private currentUrlIndex = 0;
  
  private webSocket!: WebSocket; 

  // Subjects for message and connection handling
  private connectionIsOpen = new BehaviorSubject<boolean>(false); 
  private messageReceived = new Subject<any>()
  public connectionIsOpen$ = this.connectionIsOpen.asObservable()  
  public messageRecieved$ = this.messageReceived.asObservable()



  constructor(
    private cryptoService: CryptoService
  ) {
  }

  public connect(){
    
    const url = this.URLs[this.currentUrlIndex];

    console.log(`Connecting to ${url}`);

    this.webSocket = new WebSocket(url);

    this.webSocket.onopen = () => {
      console.log(`Connected to ${url}`);
      this.connectionIsOpen.next(true);
    };

    // On message - alert listeners
    this.webSocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        // All incoming messages should have a type
        if (!message || !message.type) return;
        
        console.log("Recieved message", message)
        this.messageReceived.next(message); 
      } catch (error) {
        console.error(`Error parsing websocket message\nMessage: "${event.data}"\nError:`, error)
      }
      
    };

    this.webSocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.webSocket.onclose = (event) => {
      console.log(`WebSocket closed: ${event.code}, reason: ${event.reason}`);
      this.connectionIsOpen.next(false);
      this.reconnect(); // Attempt to reconnect
    };
  }

  // Tries to establish a websocket connection with a different server
  // If an attempt to connect has been made to all servers, waits 5 seconds before trying to reconnect
  private reconnect() {
    
    // set server url to next server
    this.currentUrlIndex = (this.currentUrlIndex + 1) % this.URLs.length;

    // If all servers tried -> reconnect with timeout
    if (this.currentUrlIndex == 0){
      console.log("Reconnect after 5 seconds...")
      setTimeout(() => this.connect(), 5000); // Retry after 5 seconds
    }

    // otherwise try new server immediately
    else {
      console.log("Reconnecting...")
      this.connect();
    }
  }


  send(message: any) {

    if(!this.webSocket || this.webSocket.readyState !== WebSocket.OPEN){
      console.error("Could not send websocket message");
      return
    }
    
    // TODO: REMOVE
    console.log("sending message: ", message);

    this.webSocket.send(JSON.stringify(message));
  }

  async sendAsSignedData(data: Hello | ChatData | PublicChat ){

    let message = {} as SignedData;

    message.type = "signed_data"
    message.counter = this.getCounter()
    message.data = data;

    let dataToSign = JSON.stringify(data) + message.counter.toString();

    message.signature = await this.cryptoService.signRsa(dataToSign);
    
    this.send(message);
  }

  private getCounter(): number{
    
    if (localStorage.getItem("counter") === null){
      localStorage.setItem("counter", "0");
      return 0;
    }

    // Return as a number
    return parseInt(localStorage.getItem("counter") ?? "0");
  }


  private incrementCounter(){
    let counter = parseInt(localStorage.getItem("counter") ?? "0");
    counter++
    localStorage.setItem("counter", counter.toString());
  }
}