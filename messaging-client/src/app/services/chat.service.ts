import { Injectable } from '@angular/core';
import { WebSocketService } from './web-socket.service';
import { catchError, retry, throwError, tap, Subject, BehaviorSubject } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RecipientService } from './client.service';
import { CryptoService } from './crypto.service';
import { PublicChat, sanitizePublicChat } from '../models/public-chat';
import { Client } from '../models/client';
import { Chat } from '../models/chat';
import { UserService } from './user.service';
import { ChatMessage } from '../models/chat-message';


@Injectable({
  providedIn: 'root'
})
export class ChatService {

  private messages: ChatMessage[] = []

  private _messagesSubject = new BehaviorSubject<ChatMessage[]>(this.messages);
  public messages$ = this._messagesSubject.asObservable();
 

  constructor(
    private webSocketService: WebSocketService,
    private userService: UserService
  ) { 

    // TODO: Remove
    // Add test chat message
      this.addMessage({
        sender: "DByaiKOyEu1ZPe75A66HBSkR+a4NFoKTlnO7UeJaVpQ=",
        recipients: [],
        isPublic: true,
        message: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
      })
      this.addMessage({
        sender: this.userService.getUserFingerprint(),
        recipients: [],
        isPublic: true,
        message: "Public message from me"
      })
    

    // Listen for incoming messages
    this.webSocketService.messageRecieved$.subscribe((message: any) => {  
      this.processMessage(message);
    });
    
  }

  private processMessage(message: any){
    if (!message) return;
    
    if (message.type == "public_chat"){
      this.processPublicChat(message);
    }

    if (message.type == "chat"){
      this.processChat(message);
    }
  }

  // Sanitize public chat message & add to messages
  private processPublicChat(message: any){
    const publicChat = sanitizePublicChat(message);
    if (!publicChat) return;

    this.addMessage(this.publicChatToChatMessage(publicChat))
  }

  // TODO: Implement
  private processChat(message: any){
    console.error("Chat processing not implemented");
  }

  // Adds a message to the messages subject & emits to observers
  private addMessage(message:ChatMessage){
    
    console.log("Message added to chat service:",message)

    let newMessages = this._messagesSubject.getValue()
    newMessages.push(message);

    this._messagesSubject.next(newMessages);
  }

  // TODO: Implement
  public sendMessage(message: string, recipients: Client[]){
    console.error("Send message not implemented");
  }

  // Sends a public chat message
  public async sendPublicMessage(message: string){
    // Generate sender fingerprint
    const userFingerprint = this.userService.getUserFingerprint();

    // Send as signed_data
    this.webSocketService.sendAsData({
      type: "public_chat",
      sender: userFingerprint,
      message: message
    } as PublicChat)

    // Add message to messages
    const chatMessage: ChatMessage = {
      sender: userFingerprint,
      recipients: [],
      isPublic: true,
      message: message
    }
    this.addMessage(chatMessage);
  }

  private publicChatToChatMessage(publicChat: PublicChat): ChatMessage{

    return {
      sender: publicChat.sender,
      recipients: [],
      isPublic: true,
      message: publicChat.message
    }

  }

}
