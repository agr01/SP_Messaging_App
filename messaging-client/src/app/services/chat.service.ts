import { Injectable } from '@angular/core';
import { WebSocketService } from './web-socket.service';
import { catchError, retry, throwError, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Injectable({
  providedIn: 'root'
})
export class ChatService {

  private messages: string[] = ["aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    
  ]

  // TODO: put selected user here - selected from sidebar component
  public selectedUser: string = '';

  constructor(
    private webSocketService: WebSocketService,
  ) { 

    this.webSocketService.webSocket$
    .pipe(
      tap((value: string) => {
        // Log the raw received data for debugging
        console.log('Received raw data:', value);
      }),
      catchError((error) => {
        // TODO: Make error messages dev only
        console.error("websocket chat error:", error);
        return throwError(() => new Error(error));
      }),
      retry({ delay: 5_000 }),
      takeUntilDestroyed()
    )
    .subscribe((value: any) => {
      if (value) {
        
        // TODO: Validate message format
        // Process the parsed message
        this.addMessage(value.message); 
      }
    });
  }

  // TODO: filter by selected user
  public getMessages(): string[]{
    return this.messages;
  }

  public addMessage(message:string){
    
    console.log(`Message added to chat service: \n'${message}'`)
    this.messages.push(message);  

  }

  public sendMessage(message: string){

    this.addMessage(message);

    this.webSocketService.sendMessage(message)
  }
}
