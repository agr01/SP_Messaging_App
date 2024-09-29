import { Injectable } from '@angular/core';
import { WebSocketService } from './web-socket.service';
import { catchError, retry, throwError, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ClientService } from './client.service';

@Injectable({
  providedIn: 'root'
})
export class ChatService {

  private messages: string[] = ["aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    
  ]
 

  constructor(
    private webSocketService: WebSocketService,
    private clientService: ClientService
  ) { 

    // Listen for incoming messages
    this.webSocketService.messageRecieved$.subscribe((message: any) => {
      
      // TODO: check format
      // TODO: Validate message (validate signature)
      if (message.data?.type === "chat"){
        this.addMessage(message.message);
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

    this.webSocketService.send(message)
  }
}
