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

    // Listen for incoming messages
    this.webSocketService.messageRecieved$.subscribe((message: any) => {
      this.addMessage(message.message);
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
