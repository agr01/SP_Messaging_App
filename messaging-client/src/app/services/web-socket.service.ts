import { Injectable, OnDestroy } from '@angular/core';
import { webSocket } from 'rxjs/webSocket';
import { catchError, retry, throwError, tap, takeUntil, Subject, Observable, NextObserver, BehaviorSubject, Subscription } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Hello } from '../models/hello';
import { ChatData } from '../models/chat';
import { PublicChat } from '../models/public-chat';
import { SignedData } from '../models/signed-data';
import { CryptoService } from './crypto.service';



@Injectable({
  providedIn: 'root',
})
export class WebSocketService implements OnDestroy {
  // TODO: Change to actual websocket server
  private readonly URL = 'ws://localhost:3000'

  // Subjects for message and connection handling
  private connectionOpened = new Subject<Event>()
  private connectionClosed = new Subject<Event>()
  private connectionIsOpen = new BehaviorSubject<boolean>(false); 

  private messageReceived = new Subject<any>()

  // Web socket subject
  private webSocketSubject = webSocket<any>(
    {
      url: this.URL,
      openObserver: this.connectionOpened,
      closeObserver: this.connectionClosed,

    }
  )

  public webSocket$ = this.webSocketSubject.asObservable()
  public connectionOpened$ = this.connectionOpened.asObservable()
  public connectionIsOpen$ = this.connectionIsOpen.asObservable()
  public connectionClosed$ = this.connectionClosed.asObservable()
  
  public messageRecieved$ = this.messageReceived.asObservable()

  private webSocketSubscription: Subscription
  private connectionOpenedSubscription: Subscription
  private connectionClosedSubscription: Subscription

  constructor(
    private cryptoService: CryptoService
  ) {
    
    // Send hello message when connection is opened
    this.connectionOpenedSubscription = this.connectionOpened.subscribe(
      () => {
        this.connectionIsOpen.next(true);
        console.log("connection opened");
      }
    );

    this.connectionClosedSubscription = this.connectionClosed.subscribe(
      () => {
        this.connectionIsOpen.next(false);
        console.log("connection closed");
      }
    );
    

    // Listen for incoming messages with retry and cleanup logic
    this.webSocketSubscription = this.webSocketSubject
      .pipe(
        retry({ delay: 5000 }), // Retry connection every 5 seconds if it fails
      )
      .subscribe(
        (message: any) => {
          // TODO: Remove
          console.log("Recieved message", message)
          this.messageReceived.next(message);
        }
      );

  }
  ngOnDestroy(): void {
    console.log("Web socket service destroyed");

    this.webSocketSubscription.unsubscribe();
    this.connectionOpenedSubscription.unsubscribe();
    this.connectionClosedSubscription.unsubscribe();
  }


  send(message: any): void {
    this.webSocketSubject.next(message);
  }

  async sendAsData(data: Hello | ChatData | PublicChat ){

    let message = {} as SignedData;

    message.type = "signed_data"
    message.counter = this.getCounter()
    message.data = data;

    let dataToSign = JSON.stringify(data) + message.counter.toString();

    message.signature = await this.cryptoService.signRsa(dataToSign);

    console.log("sending message: ", message);
    
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