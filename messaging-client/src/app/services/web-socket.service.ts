import { Injectable } from '@angular/core';
import { webSocket } from 'rxjs/webSocket';
import { catchError, retry, throwError, tap, takeUntil, Subject, Observable, NextObserver } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';



@Injectable({
  providedIn: 'root',
})
export class WebSocketService {
  // TODO: Change to actual websocket server
  private readonly URL = 'ws://localhost:3000/echo'

  // Subjects for message and connection handling
  private connectionOpened = new Subject<Event>()
  private messageReceived = new Subject<any>()

  // Web socket subject
  private webSocketSubject = webSocket<any>(
    {
      url: this.URL,
      openObserver: this.connectionOpened,
    }
  )

  public webSocket$ = this.webSocketSubject.asObservable()
  public connectionOpened$ = this.connectionOpened.asObservable()
  public messageRecieved$ = this.messageReceived.asObservable()

  constructor() {
    
    // Send hello message when connection is opened
    this.connectionOpened.subscribe(
      () => {
        console.log("connection opened");
      }
    );
    

    // Listen for incoming messages with retry and cleanup logic
    this.webSocketSubject
      .pipe(
        retry({ delay: 5000 }), // Retry connection every 5 seconds if it fails
        catchError((error) => {
          console.error('WebSocket error:', error);
          return throwError(() => new Error(error));
        }),
        takeUntilDestroyed()
      )
      .subscribe(
        (message: any) => {
          this.messageReceived.next(message);
        }
      );

  }


  sendMessage(message: string): void {
    this.webSocketSubject.next(message);
  }
}