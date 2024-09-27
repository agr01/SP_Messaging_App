import { Injectable } from '@angular/core';
import { WebSocketService } from './web-socket.service';

@Injectable({
  providedIn: 'root'
})
export class ChatService {

  private messages: string[] = ["Absolutely not Absolutely not Absolutely not Absolutely not",
    "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    "Hello!"]

  constructor(
    private webSocketService: WebSocketService,
  ) { }


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
