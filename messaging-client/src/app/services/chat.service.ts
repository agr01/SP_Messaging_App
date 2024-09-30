import { Injectable } from '@angular/core';
import { WebSocketService } from './web-socket.service';
import { catchError, retry, throwError, tap, Subject, BehaviorSubject } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ClientService } from './client.service';
import { CryptoService } from './crypto.service';
import { PublicChat } from '../models/public-chat';
import { Client } from '../models/client';
import { Chat } from '../models/chat';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root'
})
export class ChatService {

  private messages: Chat[] = []

  private _messagesSubject = new BehaviorSubject<Chat[]>(this.messages);
  public messages$ = this._messagesSubject.asObservable();
 

  constructor(
    private webSocketService: WebSocketService,
    private cryptoService: CryptoService,
    private userService: UserService
  ) { 

    // TODO: Remove
    // Add test chat message
      this.addMessage({
        participants: ["public"],
        message: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
      })
    

    // Listen for incoming messages
    this.webSocketService.messageRecieved$.subscribe((message: any) => {
      
      // TODO: check format
      // TODO: Validate message (validate signature)
      if (message.data?.type === "chat"){
        this.addMessage({message: message.message, participants: []});
      }
      
    });
    
  }

  // Adds a message to the messages subject & emits to observers
  private addMessage(message:Chat){
    
    console.log("Message added to chat service:",message)

    let newMessages = this._messagesSubject.getValue()
    newMessages.push(message);

    this._messagesSubject.next(newMessages);
  }

  // TODO: Implement
  public sendMessage(message: Chat, clients: Client[]){

    this.addMessage(message);

    this.webSocketService.send(message)
  }

  // Sends a public chat message
  public async sendPublicMessage(message: string){
    // Generate sender fingerprint
    const userFingerprint = await this.cryptoService.generateUserFingerprint();

    // Send as signed_data
    this.webSocketService.sendAsData({
      type: "public_chat",
      sender: userFingerprint,
      message: message
    } as PublicChat)
  }

}
