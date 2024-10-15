import { Injectable } from '@angular/core';
import { Subject, BehaviorSubject} from 'rxjs';
import { CryptoService } from './crypto.service';
import { DEFAULT_SERVER, DEFAULT_WEBSOCKET, SERVERS } from '../constants';


@Injectable({
  providedIn: 'root',
})
export class WebSocketService {
  
  private currentUrlIndex = 0;
  private currentServer: string = DEFAULT_SERVER
  private readonly webSocketUrls: string[] = SERVERS
  private readonly defaultWebSocketUrl: string = DEFAULT_SERVER
  
  private webSocket!: WebSocket; 

  // Subjects for message and connection handling
  private connectionIsOpen = new BehaviorSubject<boolean>(false); 
  private messageReceived = new Subject<any>()
  public connectionIsOpen$ = this.connectionIsOpen.asObservable()  
  public messageRecieved$ = this.messageReceived.asObservable()

  private connectedServerSubject = new BehaviorSubject<string>(this.currentServer); 
  public connectedServer$ = this.connectedServerSubject.asObservable();

  constructor(
    private cryptoService: CryptoService
  ) {
  }

  public connect(){
    
    console.log(`Connecting to ${this.currentServer}`);

    const url = "ws://" + this.currentServer

    this.webSocket = new WebSocket(url);

    // Emit connected server change on successfull open
    this.webSocket.onopen = () => {
      console.log(`Connected to ${this.currentServer}`);
      this.connectionIsOpen.next(true);
      this.connectedServerSubject.next(this.currentServer);
    };

    // On message - alert listeners
    this.webSocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        // All incoming messages should have a type
        if (!message || !message.type) return;
        
        console.log(`Received message from ${this.currentServer}`, message)

        this.messageReceived.next(message); 
      } catch (error) {
        console.error(`Error parsing websocket message\nError:`, error)
        console.error("Could not parse:", event.data)
      }
      
    };

    this.webSocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.webSocket.onclose = (event) => {
      console.log(`WebSocket closed: ${event.code}, reason: ${event.reason}`);
      this.connectionIsOpen.next(false);
      
      // Attempt to reconnect
      this.reconnect()
    };
  }

  // Tries to establish a websocket connection with a different server
  // If an attempt to connect has been made to all servers, waits 5 seconds before trying to reconnect
  private reconnect() {

    const prevServerUrl = "ws://" + this.currentServer

    // If last server was not default - try connecting to default first
    if (prevServerUrl !== this.defaultWebSocketUrl){
      this.currentServer = this.defaultWebSocketUrl;
      this.connect();
      return;
    }

    // Else try a different server from the list
    this.currentServer = this.webSocketUrls[this.currentUrlIndex]
    
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

    // set server url to next server
    this.currentUrlIndex = (this.currentUrlIndex + 1) % this.webSocketUrls.length;
  }


  send(message: any) {

    if(!this.webSocket || this.webSocket.readyState !== WebSocket.OPEN){
      console.error("Could not send websocket message:", message);
      return
    }
    
    console.log(`sending message to ${this.currentServer}: `, message);

    this.webSocket.send(JSON.stringify(message));
  }

 
}